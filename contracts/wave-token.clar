;; wave-token.clar - SIP-010 fungible token for the WAVE game
;; WAVE has no monetary value and cannot be traded for STX.

(define-fungible-token wave-token)

;; --- Constants ---

(define-constant GAME_CONTRACT .wave-game)

(define-constant FAUCET_AMOUNT   u500000000) ;; 500 WAVE (6 decimals)
(define-constant FAUCET_COOLDOWN u144)       ;; ~24 hours in blocks

(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_FAUCET_TOO_SOON (err u101))

;; --- Storage ---

(define-map last-claim-block principal uint)

;; --- SIP-010 Interface ---

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_NOT_AUTHORIZED)
    (try! (ft-transfer? wave-token amount sender recipient))
    (match memo m (begin (print m) true) true)
    (ok true)))

(define-read-only (get-name)
  (ok "WAVE"))

(define-read-only (get-symbol)
  (ok "WAVE"))

(define-read-only (get-decimals)
  (ok u6))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance wave-token who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply wave-token)))

(define-read-only (get-token-uri)
  (ok (some u"https://wave.game/api/token-metadata")))

;; --- Faucet ---

(define-public (claim-daily)
  (let ((last-claim (default-to u0 (map-get? last-claim-block tx-sender))))
    ;; u0 sentinel = never claimed; always allow. Otherwise enforce 144-block cooldown.
    (asserts! (or (is-eq last-claim u0) (>= stacks-block-height (+ last-claim FAUCET_COOLDOWN))) ERR_FAUCET_TOO_SOON)
    (map-set last-claim-block tx-sender stacks-block-height)
    (try! (ft-mint? wave-token FAUCET_AMOUNT tx-sender))
    (print { event: "faucet-claim", recipient: tx-sender, amount: FAUCET_AMOUNT, block: stacks-block-height })
    (ok FAUCET_AMOUNT)))

(define-read-only (get-last-claim (who principal))
  (ok (default-to u0 (map-get? last-claim-block who))))

;; --- Restricted: game contract only ---

(define-public (burn (amount uint) (sender principal))
  (begin
    (asserts! (is-eq contract-caller GAME_CONTRACT) ERR_NOT_AUTHORIZED)
    (try! (ft-burn? wave-token amount sender))
    (print { event: "token-burned", sender: sender, amount: amount })
    (ok true)))

(define-public (mint-reward (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq contract-caller GAME_CONTRACT) ERR_NOT_AUTHORIZED)
    (try! (ft-mint? wave-token amount recipient))
    (print { event: "reward-minted", recipient: recipient, amount: amount })
    (ok true)))
