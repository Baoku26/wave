;; wave-nft.clar - SIP-009 non-fungible token for minted WAVE runs
;; Mint is restricted to wave-game.clar. NFTs are transferable.

(define-non-fungible-token wave-run uint)

;; --- Constants ---

(define-constant GAME_CONTRACT .wave-game)

(define-constant ERR_NOT_AUTHORIZED (err u300))
(define-constant ERR_NOT_OWNER      (err u302))

;; --- Storage ---

(define-data-var last-token-id uint u0)

;; ipfs-cid as (string-ascii 64) covers CIDv0 (Qm...) and CIDv1 (bafy...)
;; token-uri stored at mint time as "ipfs://<cid>" so wallets resolve it natively
(define-map nft-metadata uint {
  run-id:    (buff 32),
  player:    principal,
  era-id:    (string-ascii 64),
  score:     uint,
  ipfs-cid:  (string-ascii 64),
  token-uri: (string-ascii 80)
})

;; --- SIP-009 Interface ---

(define-read-only (get-last-token-id)
  (ok (var-get last-token-id)))

(define-read-only (get-token-uri (token-id uint))
  (match (map-get? nft-metadata token-id)
    meta (ok (some (get token-uri meta)))
    (ok none)))

(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? wave-run token-id)))

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_NOT_AUTHORIZED)
    (asserts! (is-eq (some sender) (nft-get-owner? wave-run token-id)) ERR_NOT_OWNER)
    (try! (nft-transfer? wave-run token-id sender recipient))
    (print { event: "nft-transfer", token-id: token-id, sender: sender, recipient: recipient })
    (ok true)))

;; --- Mint (game contract only) ---

(define-public (mint
  (recipient  principal)
  (run-id     (buff 32))
  (era-id     (string-ascii 64))
  (score      uint)
  (ipfs-cid   (string-ascii 64))
  (token-uri  (string-ascii 80)))
  (let ((next-id (+ (var-get last-token-id) u1)))
    (asserts! (is-eq contract-caller GAME_CONTRACT) ERR_NOT_AUTHORIZED)
    (try! (nft-mint? wave-run next-id recipient))
    (map-set nft-metadata next-id {
      run-id:    run-id,
      player:    recipient,
      era-id:    era-id,
      score:     score,
      ipfs-cid:  ipfs-cid,
      token-uri: token-uri
    })
    (var-set last-token-id next-id)
    (print { event: "nft-minted", token-id: next-id, recipient: recipient, era-id: era-id, score: score })
    (ok next-id)))

;; --- Read helpers ---

(define-read-only (get-nft-metadata (token-id uint))
  (map-get? nft-metadata token-id))
