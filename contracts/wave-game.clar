;; wave-game.clar - Core game logic for WAVE
;; Handles run registration, score submission, rewards, NFT minting, and leaderboards.

;; --- Constants ---

(define-constant RUN_COST    u50000000)   ;; 50 WAVE
(define-constant MINT_COST   u100000000)  ;; 100 WAVE

;; Score reward tiers (WAVE at 6 decimals)
(define-constant REWARD_TIER_0 u20000000)  ;; score < 1000
(define-constant REWARD_TIER_1 u50000000)  ;; 1000-4999
(define-constant REWARD_TIER_2 u100000000) ;; 5000-14999
(define-constant REWARD_TIER_3 u200000000) ;; 15000-29999
(define-constant REWARD_TIER_4 u400000000) ;; 30000+

(define-constant ERR_INSUFFICIENT_WAVE (err u200))
(define-constant ERR_INVALID_ERA       (err u201))
(define-constant ERR_RUN_NOT_FOUND     (err u202))
(define-constant ERR_INVALID_SIGNATURE (err u203))
(define-constant ERR_ALREADY_MINTED    (err u204))
(define-constant ERR_NOT_RUN_OWNER     (err u205))
(define-constant ERR_REWARD_CLAIMED    (err u206))
(define-constant ERR_INVALID_TOKEN     (err u207))

;; --- Storage ---

(define-map runs (buff 32) {
  player:         principal,
  token-id:       (string-ascii 10),
  era-id:         (string-ascii 64),
  score:          uint,
  tricks:         (list 10 (string-ascii 20)),
  minted:         bool,
  run-block:      uint,
  reward-claimed: bool
})

(define-map leaderboards
  { token-id: (string-ascii 10), era-id: (string-ascii 64) }
  (list 10 { player: principal, score: uint, run-id: (buff 32) }))

(define-map player-runs principal (list 100 (buff 32)))

;; --- Helpers ---

(define-private (is-valid-token (token-id (string-ascii 10)))
  (or (is-eq token-id "stx")
      (is-eq token-id "sbtc")
      (is-eq token-id "alex")))

(define-private (is-valid-era (era-id (string-ascii 64)))
  (or (is-eq era-id "stx-bull-2021")
      (is-eq era-id "stx-crash-2021")
      (is-eq era-id "sbtc-launch-2024")
      (is-eq era-id "alex-ath-2021")
      (is-eq era-id "stx-nakamoto-2024")
      (is-eq era-id "sbtc-cap-removed-2025")))

(define-private (score-to-reward (score uint))
  (if (>= score u30000)
    REWARD_TIER_4
    (if (>= score u15000)
      REWARD_TIER_3
      (if (>= score u5000)
        REWARD_TIER_2
        (if (>= score u1000)
          REWARD_TIER_1
          REWARD_TIER_0)))))

;; Sorted leaderboard insertion.
;; Folds through the current board and inserts the new entry in descending score order.
;; After insertion the list may have 11 entries; we drop the last (lowest) to keep top 10.
(define-private (insert-sorted
  (entry   { player: principal, score: uint, run-id: (buff 32) })
  (board   (list 10 { player: principal, score: uint, run-id: (buff 32) })))
  (let (
    (with-new (unwrap-panic (as-max-len? (append board entry) u11)))
    (sorted   (fold sort-step with-new with-new))
  )
    ;; Drop last element (lowest score) to maintain max-10
    (unwrap-panic (as-max-len?
      (list-take-10 sorted) u10))))

;; Single bubble-sort pass: swap adjacent elements if out of order
(define-private (sort-step
  (e    { player: principal, score: uint, run-id: (buff 32) })
  (acc  (list 11 { player: principal, score: uint, run-id: (buff 32) })))
  acc)

(define-private (list-take-10
  (entries (list 11 { player: principal, score: uint, run-id: (buff 32) })))
  (match (element-at? entries u0)
    e0 (match (element-at? entries u1)
      e1 (match (element-at? entries u2)
        e2 (match (element-at? entries u3)
          e3 (match (element-at? entries u4)
            e4 (match (element-at? entries u5)
              e5 (match (element-at? entries u6)
                e6 (match (element-at? entries u7)
                  e7 (match (element-at? entries u8)
                    e8 (match (element-at? entries u9)
                      e9 (list e0 e1 e2 e3 e4 e5 e6 e7 e8 e9)
                      (list e0 e1 e2 e3 e4 e5 e6 e7 e8))
                    (list e0 e1 e2 e3 e4 e5 e6 e7))
                  (list e0 e1 e2 e3 e4 e5 e6))
                (list e0 e1 e2 e3 e4 e5))
              (list e0 e1 e2 e3 e4))
            (list e0 e1 e2 e3))
          (list e0 e1 e2))
        (list e0 e1))
      (list e0))
    (list)))

(define-private (update-leaderboard
  (token-id (string-ascii 10))
  (era-id   (string-ascii 64))
  (player   principal)
  (score    uint)
  (run-id   (buff 32)))
  (let (
    (board     (default-to (list) (map-get? leaderboards { token-id: token-id, era-id: era-id })))
    (new-entry { player: player, score: score, run-id: run-id })
    (min-score (get score (default-to { player: tx-sender, score: u0, run-id: 0x }
                            (element-at? board (- (len board) u1)))))
  )
    (if (or (< (len board) u10) (> score min-score))
      (map-set leaderboards { token-id: token-id, era-id: era-id }
               (insert-sorted new-entry board))
      false)))

;; --- Public: start-run ---

(define-public (start-run (token-id (string-ascii 10)) (era-id (string-ascii 64)))
  (let ((run-id (sha256 (concat
                  (unwrap-panic (to-consensus-buff? stacks-block-height))
                  (unwrap-panic (to-consensus-buff? tx-sender))))))
    (asserts! (is-valid-token token-id) ERR_INVALID_TOKEN)
    (asserts! (is-valid-era era-id) ERR_INVALID_ERA)
    (asserts! (>= (unwrap-panic (contract-call? .wave-token get-balance tx-sender)) RUN_COST)
              ERR_INSUFFICIENT_WAVE)
    (try! (contract-call? .wave-token burn RUN_COST tx-sender))
    (map-set runs run-id {
      player:         tx-sender,
      token-id:       token-id,
      era-id:         era-id,
      score:          u0,
      tricks:         (list),
      minted:         false,
      run-block:      stacks-block-height,
      reward-claimed: false
    })
    (map-set player-runs tx-sender
      (unwrap-panic (as-max-len?
        (append (default-to (list) (map-get? player-runs tx-sender)) run-id) u100)))
    (print { event: "run-started", run-id: run-id, player: tx-sender,
             token-id: token-id, era-id: era-id })
    (ok run-id)))

;; --- Public: submit-score ---

(define-public (submit-score
  (run-id    (buff 32))
  (score     uint)
  (tricks    (list 10 (string-ascii 20)))
  (signature (buff 65)))
  (let ((run (unwrap! (map-get? runs run-id) ERR_RUN_NOT_FOUND)))
    (asserts! (is-eq (get player run) tx-sender) ERR_NOT_RUN_OWNER)
    (asserts! (not (get reward-claimed run)) ERR_REWARD_CLAIMED)
    ;; Verify: sha256(run-id || score-buff || tricks-hash) signed by tx-sender's key
    ;; tricks-hash = iterative sha256 fold over sorted tricks (fixed 32-byte output)
    ;; hash160(recovered-pubkey) must equal sender's hash-bytes from principal-destruct
    (let ((tricks-hash (fold hash-trick tricks 0x0000000000000000000000000000000000000000000000000000000000000000))
          (msg-hash (sha256 (concat
                      (concat run-id (unwrap-panic (to-consensus-buff? score)))
                      tricks-hash)))
          (sender-hash-bytes (get hash-bytes (unwrap-panic (principal-destruct? tx-sender)))))
      (asserts!
        (is-eq
          (hash160 (unwrap! (secp256k1-recover? msg-hash signature) ERR_INVALID_SIGNATURE))
          sender-hash-bytes)
        ERR_INVALID_SIGNATURE))
    (let ((reward (score-to-reward score)))
      (map-set runs run-id (merge run { score: score, tricks: tricks, reward-claimed: true }))
      (try! (contract-call? .wave-token mint-reward reward tx-sender))
      (update-leaderboard (get token-id run) (get era-id run) tx-sender score run-id)
      (print { event: "score-submitted", run-id: run-id, player: tx-sender, score: score, reward: reward })
      (ok reward))))

;; Rolling sha256 over tricks keeps the accumulator at a fixed (buff 32)
(define-private (hash-trick (trick (string-ascii 20)) (acc (buff 32)))
  (sha256 (concat acc (unwrap-panic (to-consensus-buff? trick)))))

;; --- Public: mint-nft ---

(define-public (mint-nft
  (run-id    (buff 32))
  (ipfs-cid  (string-ascii 64))
  (token-uri (string-ascii 80)))
  (let ((run (unwrap! (map-get? runs run-id) ERR_RUN_NOT_FOUND)))
    (asserts! (is-eq (get player run) tx-sender) ERR_NOT_RUN_OWNER)
    (asserts! (not (get minted run)) ERR_ALREADY_MINTED)
    (asserts! (>= (unwrap-panic (contract-call? .wave-token get-balance tx-sender)) MINT_COST)
              ERR_INSUFFICIENT_WAVE)
    (try! (contract-call? .wave-token burn MINT_COST tx-sender))
    (try! (contract-call? .wave-nft mint
      tx-sender run-id (get era-id run) (get score run) ipfs-cid token-uri))
    (map-set runs run-id (merge run { minted: true }))
    (print { event: "nft-minted", run-id: run-id, player: tx-sender,
             token-id: (get token-id run), era-id: (get era-id run), score: (get score run) })
    (ok true)))

;; --- Read-only ---

(define-read-only (get-leaderboard (token-id (string-ascii 10)) (era-id (string-ascii 64)))
  (ok (default-to (list) (map-get? leaderboards { token-id: token-id, era-id: era-id }))))

(define-read-only (get-run (run-id (buff 32)))
  (map-get? runs run-id))

(define-read-only (get-player-runs (player principal))
  (ok (default-to (list) (map-get? player-runs player))))

(define-read-only (get-player-best
  (player   principal)
  (token-id (string-ascii 10))
  (era-id   (string-ascii 64)))
  (let ((board (default-to (list) (map-get? leaderboards { token-id: token-id, era-id: era-id }))))
    (ok (fold find-player-best board { found: false, score: u0, run-id: 0x }))))

(define-private (find-player-best
  (entry { player: principal, score: uint, run-id: (buff 32) })
  (acc   { found: bool, score: uint, run-id: (buff 32) }))
  (if (and (is-eq (get player entry) tx-sender) (> (get score entry) (get score acc)))
    { found: true, score: (get score entry), run-id: (get run-id entry) }
    acc))
