; Simple Hello World Program

; Constants (Assembler needs to handle these or hardcode addresses)
STRING_DATA   = $0100
VRAM_TARGET   = $0428 ; Start of second line (40 chars per line)

; Code Segment
.ORG $0000        ; Start code at address 0x0000
  LDX #$00          ; Initialize index X = 0
LOOP:
  LDA STRING_DATA, X ; Load character from string data using X index
  CMP #$00          ; Compare with null terminator (0x00)
  BEQ DONE          ; If zero (end of string), branch to DONE

  STA VRAM_TARGET, X ; Store character to VRAM using X index
  INX             ; Increment X
  JMP LOOP        ; Jump back to LOOP

DONE:
  JMP DONE        ; Infinite loop when finished

; Data Segment
.ORG STRING_DATA  ; Start data at address 0x0100
  .BYTE $48, $45, $4C, $4C, $4F ; H E L L O
  .BYTE $20                     ; Space
  .BYTE $57, $4F, $52, $4C, $44 ; W O R L D
  .BYTE $00                     ; Null terminator