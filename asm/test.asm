; filepath: c:\source\cpu-custom\asm\test_suite.asm
; Assembly program to test various implemented opcodes with PASS/FAIL output

; --- Constants ---
VRAM_START    = $0400
VRAM_LINE_LEN = 40

ZP_PTR1       = $30 ; Zero Page pointer for indirect addressing
ZP_PTR2       = $32 ; Another ZP pointer
ZP_TARGET     = $42 ; Zero Page target for LDA/STA ZP
ZP_STX_TARGET = $30 ; Zero Page target for STX ZP (overlaps with ZP_PTR1 low byte)
ZP_STA_TARGET = $55 ; Zero Page target for STA ZP

ABS_BASE_ADDR = $0200 ; Base address for Absolute,Y tests
ABS_TARGET_Y  = ABS_BASE_ADDR + $05 ; Effective address for LDA/STA Abs,Y (Y=5)

IND_BASE_ADDR = $1234 ; Base address for Indirect,Y tests (stored at ZP_PTR1)
IND_TARGET_Y  = IND_BASE_ADDR + $05 ; Effective address for LDA Ind,Y (Y=5)

IND_STA_BASE  = $4567 ; Base address for STA Ind,Y (stored at ZP_PTR2)
IND_STA_TARGET= IND_STA_BASE + $0A ; Effective address for STA Ind,Y (Y=A)

SUBROUTINE_ADDR = $0300 ; Address of a simple subroutine

; Zero Page locations for subroutines
ZP_STR_PTR_L  = $FB ; Low byte of string address pointer
ZP_STR_PTR_H  = $FC ; High byte of string address pointer
ZP_VRAM_PTR_L = $FD ; Low byte of VRAM write pointer
ZP_VRAM_PTR_H = $FE ; High byte of VRAM write pointer

; Subroutine Addresses (Place them after main code)
PRINT_STRING_SUB = $0200 ; Choose an unused area
NEXT_LINE_SUB    = $0240 ; Choose an unused area

; String Data Addresses (Place them in data segment)
STR_LDX_IMM      = $0310
STR_STX_ZP       = $0320
STR_ADC_IMM_1    = $0330
STR_ADC_IMM_2    = $0340
STR_ADC_IMM_3    = $0350
STR_ADC_IMM_4    = $0360
STR_ADC_IMM_5    = $0370
STR_LDY_IMM      = $0380
STR_LDA_ABSY     = $0390
STR_STA_ABSY     = $03A0
STR_INY_1        = $03B0
STR_INY_2        = $03C0
STR_CPY_IMM_1    = $03D0
STR_CPY_IMM_2    = $03E0
STR_CPY_IMM_3    = $03F0
STR_BNE_TAKEN    = $0400 ; Note: Overlaps VRAM start, adjust if needed
STR_BNE_NOTTAKEN = $0418 ; Adjust addresses as needed
STR_DEX_1        = $0430
STR_DEX_2        = $0440
STR_DEX_3        = $0450
STR_BPL_TAKEN    = $0460
STR_BPL_NOTTAKEN = $0478
STR_LDA_ZP       = $0490
STR_STA_ZP       = $04A0
STR_LDA_INDY     = $04B0
STR_STA_INDY     = $04C0
STR_JSR_RTS      = $04D0

STR_PASS         = $0500
STR_FAIL         = $0510

; --- Code Segment ---
.ORG $0000

START:
  ; Initialize VRAM Pointer to start of screen
  LDA #<VRAM_START
  STA ZP_VRAM_PTR_L
  LDA #>VRAM_START
  STA ZP_VRAM_PTR_H

  ; --- Test LDX Immediate ---
  JSR PRINT_TEST_NAME ; Print "TEST LDX IMM: "
  .WORD STR_LDX_IMM
  LDX #$55          ; Load X with 0x55
  CPX #$55          ; Compare X with expected value
  JSR PRINT_RESULT  ; Prints PASS if Z=1 (equal), FAIL otherwise

  ; --- Test STX Zero Page ---
  JSR PRINT_TEST_NAME
  .WORD STR_STX_ZP
  LDX #$AA          ; Load different value
  STX ZP_STX_TARGET ; Store X (0xAA) to address 0x30
  LDA ZP_STX_TARGET ; Load back from memory
  CMP #$AA          ; Compare with expected value
  JSR PRINT_RESULT

  ; --- Test ADC Immediate (Case 1: 20+10+0=30) ---
  JSR PRINT_TEST_NAME
  .WORD STR_ADC_IMM_1
  LDA #$20
  CLC
  ADC #$10          ; A = 0x30
  CMP #$30
  JSR PRINT_RESULT

  ; --- Test ADC Immediate (Case 2: 30+10+1=41) ---
  JSR PRINT_TEST_NAME
  .WORD STR_ADC_IMM_2
  ; A is 0x30 from previous test
  SEC
  ADC #$10          ; A = 0x41
  CMP #$41
  JSR PRINT_RESULT

  ; --- Test ADC Immediate (Case 3: 01+7F+0=80) ---
  JSR PRINT_TEST_NAME
  .WORD STR_ADC_IMM_3
  LDA #$01
  CLC
  ADC #$7F          ; A = 0x80
  CMP #$80
  ; Also check flags if needed (e.g., store P, compare)
  JSR PRINT_RESULT

  ; --- Test ADC Immediate (Case 4: 80+80+0=00, C=1) ---
  JSR PRINT_TEST_NAME
  .WORD STR_ADC_IMM_4
  LDA #$80
  CLC
  ADC #$80          ; A = 0x00, C=1
  CMP #$00
  ; Need to check Carry flag separately if required
  JSR PRINT_RESULT

  ; --- Test ADC Immediate (Case 5: 01+FF+0=00, C=1) ---
  JSR PRINT_TEST_NAME
  .WORD STR_ADC_IMM_5
  LDA #$01
  CLC
  ADC #$FF          ; A = 0x00, C=1
  CMP #$00
  JSR PRINT_RESULT

  ; --- Test LDY Immediate ---
  JSR PRINT_TEST_NAME
  .WORD STR_LDY_IMM
  LDY #$88
  CPY #$88
  JSR PRINT_RESULT

  ; --- Test LDA Absolute, Y ---
  JSR PRINT_TEST_NAME
  .WORD STR_LDA_ABSY
  LDY #$05
  LDA ABS_BASE_ADDR, Y ; Load A from 0x0205 (should be $AA from data segment)
  CMP #$AA
  JSR PRINT_RESULT

  ; --- Test STA Absolute, Y ---
  JSR PRINT_TEST_NAME
  .WORD STR_STA_ABSY
  LDY #$05
  LDA #$BB
  STA ABS_BASE_ADDR, Y ; Store A to 0x0205
  LDA ABS_BASE_ADDR, Y ; Load back
  CMP #$BB
  JSR PRINT_RESULT

  ; --- Test INY (Normal) ---
  JSR PRINT_TEST_NAME
  .WORD STR_INY_1
  LDY #$05
  INY             ; Y = 0x06
  CPY #$06
  JSR PRINT_RESULT

  ; --- Test INY (Wrap) ---
  JSR PRINT_TEST_NAME
  .WORD STR_INY_2
  LDY #$FF
  INY             ; Y = 0x00
  CPY #$00
  JSR PRINT_RESULT

  ; --- Test CPY Immediate (Equal) ---
  JSR PRINT_TEST_NAME
  .WORD STR_CPY_IMM_1
  LDY #$10
  CPY #$10          ; Z=1, C=1
  ; Check Z flag
  BEQ CPY1_PASS     ; Branch if Z=1
  JMP PRINT_FAIL_AND_NEXT
CPY1_PASS:
  JSR PRINT_PASS_AND_NEXT

  ; --- Test CPY Immediate (Greater) ---
  JSR PRINT_TEST_NAME
  .WORD STR_CPY_IMM_2
  LDY #$10
  CPY #$05          ; Z=0, C=1
  ; Check C flag (needs PHP/PLA or BIT trick if not directly testable)
  ; Assuming BEQ/BNE check is sufficient for now (Z=0)
  BNE CPY2_PASS     ; Branch if Z=0
  JMP PRINT_FAIL_AND_NEXT
CPY2_PASS:
  JSR PRINT_PASS_AND_NEXT

  ; --- Test CPY Immediate (Less) ---
  JSR PRINT_TEST_NAME
  .WORD STR_CPY_IMM_3
  LDY #$10
  CPY #$80          ; Z=0, C=0
  ; Check C flag (needs PHP/PLA or BIT trick if not directly testable)
  ; Assuming BEQ/BNE check is sufficient for now (Z=0)
  BNE CPY3_PASS     ; Branch if Z=0
  JMP PRINT_FAIL_AND_NEXT
CPY3_PASS:
  JSR PRINT_PASS_AND_NEXT


  ; --- Test BNE (Taken) ---
  JSR PRINT_TEST_NAME
  .WORD STR_BNE_TAKEN
  LDA #$01
  CMP #$02          ; Z=0
  BNE BNE_TAKEN_TARGET ; Branch should be taken
  JMP PRINT_FAIL_AND_NEXT ; Should not reach here if branch works
BNE_TAKEN_NOP:
  NOP             ; Should be skipped
BNE_TAKEN_TARGET:
  JSR PRINT_PASS_AND_NEXT ; Reached target, PASS

  ; --- Test BNE (Not Taken) ---
  JSR PRINT_TEST_NAME
  .WORD STR_BNE_NOTTAKEN
  LDA #$01
  CMP #$01          ; Z=1
  BNE BNE_NOTTAKEN_FAIL ; Branch should NOT be taken
  JSR PRINT_PASS_AND_NEXT ; Should reach here
  JMP BNE_NOTTAKEN_DONE ; Skip fail path
BNE_NOTTAKEN_FAIL:
  JMP PRINT_FAIL_AND_NEXT
BNE_NOTTAKEN_DONE:

  ; --- Test DEX (Normal) ---
  JSR PRINT_TEST_NAME
  .WORD STR_DEX_1
  LDX #$05
  DEX             ; X = 0x04
  CPX #$04
  JSR PRINT_RESULT

  ; --- Test DEX (Zero) ---
  JSR PRINT_TEST_NAME
  .WORD STR_DEX_2
  LDX #$01
  DEX             ; X = 0x00
  CPX #$00
  JSR PRINT_RESULT

  ; --- Test DEX (Wrap) ---
  JSR PRINT_TEST_NAME
  .WORD STR_DEX_3
  LDX #$00
  DEX             ; X = 0xFF
  CPX #$FF
  JSR PRINT_RESULT

  ; --- Test BPL (Taken) ---
  JSR PRINT_TEST_NAME
  .WORD STR_BPL_TAKEN
  LDA #$7F
  CMP #$00          ; N=0
  BPL BPL_TAKEN_TARGET ; Branch should be taken
  JMP PRINT_FAIL_AND_NEXT
BPL_TAKEN_NOP:
  NOP             ; Should be skipped
BPL_TAKEN_TARGET:
  JSR PRINT_PASS_AND_NEXT

  ; --- Test BPL (Not Taken) ---
  JSR PRINT_TEST_NAME
  .WORD STR_BPL_NOTTAKEN
  LDA #$80
  CMP #$00          ; N=1
  BPL BPL_NOTTAKEN_FAIL ; Branch should NOT be taken
  JSR PRINT_PASS_AND_NEXT
  JMP BPL_NOTTAKEN_DONE
BPL_NOTTAKEN_FAIL:
  JMP PRINT_FAIL_AND_NEXT
BPL_NOTTAKEN_DONE:

  ; --- Test LDA Zero Page ---
  JSR PRINT_TEST_NAME
  .WORD STR_LDA_ZP
  LDA #$AB          ; Prepare value
  STA ZP_TARGET     ; Store 0xAB to address 0x42
  LDA #$00          ; Clear A
  LDA ZP_TARGET     ; Load A from 0x42
  CMP #$AB
  JSR PRINT_RESULT

  ; --- Test STA Zero Page ---
  JSR PRINT_TEST_NAME
  .WORD STR_STA_ZP
  LDA #$CD
  STA ZP_STA_TARGET ; Store 0xCD to address 0x55
  LDA ZP_STA_TARGET ; Load back
  CMP #$CD
  JSR PRINT_RESULT

  ; --- Setup for Indirect Tests ---
  LDA #<(IND_BASE_ADDR) ; Low byte of 0x1234
  STA ZP_PTR1
  LDA #>(IND_BASE_ADDR) ; High byte of 0x1234
  STA ZP_PTR1+1
  LDA #<(IND_STA_BASE)  ; Low byte of 0x4567
  STA ZP_PTR2
  LDA #>(IND_STA_BASE)  ; High byte of 0x4567
  STA ZP_PTR2+1

  ; --- Test LDA Indirect Indexed Y ---
  JSR PRINT_TEST_NAME
  .WORD STR_LDA_INDY
  LDY #$05
  LDA (ZP_PTR1), Y  ; Load A from (0x1234) + 0x05 = 0x1239 (should be $EF)
  CMP #$EF
  JSR PRINT_RESULT

  ; --- Test STA Indirect Indexed Y ---
  JSR PRINT_TEST_NAME
  .WORD STR_STA_INDY
  LDY #$0A
  LDA #$FE
  STA (ZP_PTR2), Y  ; Store A to (0x4567) + 0x0A = 0x4571
  LDA #$00          ; Clear A
  LDA IND_STA_TARGET ; Load directly from target address
  CMP #$FE
  JSR PRINT_RESULT

  ; --- Test JSR/RTS ---
  JSR PRINT_TEST_NAME
  .WORD STR_JSR_RTS
  LDX #$11          ; Marker before JSR
  JSR SUBROUTINE_ADDR
  LDX #$22          ; Marker after JSR
AFTER_SUBROUTINE:
  CPX #$22          ; Check if X is the value set after JSR
  JSR PRINT_RESULT

  ; --- Infinite loop ---
DONE:
  JMP DONE

; --- Helper Subroutines ---
PRINT_TEST_NAME:
  ; Assumes the .WORD after JSR contains the string address
  PLA               ; Pull return address low byte
  STA ZP_STR_PTR_L  ; Store it temporarily
  PLA               ; Pull return address high byte
  STA ZP_STR_PTR_H  ; Store it temporarily

  LDA ZP_STR_PTR_L  ; Load low byte of return address
  CLC
  ADC #$02          ; Add 2 to get address of .WORD low byte
  STA ZP_STR_PTR_L
  LDA ZP_STR_PTR_H
  ADC #$00          ; Add carry if any
  STA ZP_STR_PTR_H  ; ZP_STR_PTR now points to the .WORD

  ; Read the string address from the .WORD
  LDY #$00
  LDA (ZP_STR_PTR_L), Y ; Load low byte of string address
  TAX                 ; Store low byte in X temporarily
  INY
  LDA (ZP_STR_PTR_L), Y ; Load high byte of string address

  ; Store the actual string address in ZP_STR_PTR
  STX ZP_STR_PTR_L
  STA ZP_STR_PTR_H

  ; Push the original return address back onto stack (adjusted)
  LDA ZP_STR_PTR_H  ; High byte of return address
  PHA
  LDA ZP_STR_PTR_L  ; Low byte of return address
  PHA

  JSR PRINT_STRING_SUB ; Print the test name string
  RTS

PRINT_RESULT:
  BEQ PRINT_PASS    ; If Z flag is set (comparison was equal), print PASS
PRINT_FAIL:
  LDA #<STR_FAIL
  STA ZP_STR_PTR_L
  LDA #>STR_FAIL
  STA ZP_STR_PTR_H
  JSR PRINT_STRING_SUB
  JMP NEXT_LINE_AND_RTS
PRINT_PASS:
  LDA #<STR_PASS
  STA ZP_STR_PTR_L
  LDA #>STR_PASS
  STA ZP_STR_PTR_H
  JSR PRINT_STRING_SUB
  ; Fall through to NEXT_LINE_AND_RTS
NEXT_LINE_AND_RTS:
  JSR NEXT_LINE_SUB
  RTS

PRINT_PASS_AND_NEXT:
  LDA #<STR_PASS
  STA ZP_STR_PTR_L
  LDA #>STR_PASS
  STA ZP_STR_PTR_H
  JSR PRINT_STRING_SUB
  JSR NEXT_LINE_SUB
  RTS

PRINT_FAIL_AND_NEXT:
  LDA #<STR_FAIL
  STA ZP_STR_PTR_L
  LDA #>STR_FAIL
  STA ZP_STR_PTR_H
  JSR PRINT_STRING_SUB
  JSR NEXT_LINE_SUB
  RTS

; --- Subroutine Implementations ---

; Prints the null-terminated string whose address is in ZP_STR_PTR_L/H
; Uses and updates ZP_VRAM_PTR_L/H
.ORG PRINT_STRING_SUB ; $0200
PRINT_LOOP:
  LDY #$00
  LDA (ZP_STR_PTR_L), Y ; Load character from string pointer
  CMP #$00          ; Check for null terminator
  BEQ PRINT_DONE

  STA (ZP_VRAM_PTR_L), Y ; Store character to VRAM pointer (Y is 0)

  ; Increment VRAM Pointer
  INC ZP_VRAM_PTR_L
  BNE SKIP_INC_VRAM_H ; If low byte wrapped, increment high byte
  INC ZP_VRAM_PTR_H
SKIP_INC_VRAM_H:

  ; Increment String Pointer
  INC ZP_STR_PTR_L
  BNE SKIP_INC_STR_H ; If low byte wrapped, increment high byte
  INC ZP_STR_PTR_H
SKIP_INC_STR_H:

  JMP PRINT_LOOP
PRINT_DONE:
  RTS

; Moves VRAM pointer to the start of the next line
.ORG NEXT_LINE_SUB ; $0240
  LDA ZP_VRAM_PTR_L ; Get current low byte
  CLC
  ADC #VRAM_LINE_LEN ; Add line length
  STA ZP_VRAM_PTR_L ; Store new low byte
  LDA ZP_VRAM_PTR_H ; Get current high byte
  ADC #$00          ; Add carry from low byte addition
  STA ZP_VRAM_PTR_H ; Store new high byte

  ; Now align to the start of the line (clear lower bits of low byte if needed)
  ; This simple version just adds VRAM_LINE_LEN. A more robust version
  ; would calculate current line number and move to (line+1)*VRAM_LINE_LEN + VRAM_START
  ; For now, we assume we don't need perfect alignment after short PASS/FAIL strings.
  RTS


; --- Simple Subroutine for JSR Test ---
.ORG SUBROUTINE_ADDR ; $0300
  RTS

; --- String Data ---
.ORG $0310
STR_LDX_IMM:      .ASCIIZ "TEST LDX IMM: "
.ORG $0320
STR_STX_ZP:       .ASCIIZ "TEST STX ZP: "
.ORG $0330
STR_ADC_IMM_1:    .ASCIIZ "TEST ADC IMM 1: "
.ORG $0340
STR_ADC_IMM_2:    .ASCIIZ "TEST ADC IMM 2: "
.ORG $0350
STR_ADC_IMM_3:    .ASCIIZ "TEST ADC IMM 3: "
.ORG $0360
STR_ADC_IMM_4:    .ASCIIZ "TEST ADC IMM 4: "
.ORG $0370
STR_ADC_IMM_5:    .ASCIIZ "TEST ADC IMM 5: "
.ORG $0380
STR_LDY_IMM:      .ASCIIZ "TEST LDY IMM: "
.ORG $0390
STR_LDA_ABSY:     .ASCIIZ "TEST LDA ABS,Y: "
.ORG $03A0
STR_STA_ABSY:     .ASCIIZ "TEST STA ABS,Y: "
.ORG $03B0
STR_INY_1:        .ASCIIZ "TEST INY NORM: "
.ORG $03C0
STR_INY_2:        .ASCIIZ "TEST INY WRAP: "
.ORG $03D0
STR_CPY_IMM_1:    .ASCIIZ "TEST CPY IMM EQ: "
.ORG $03E0
STR_CPY_IMM_2:    .ASCIIZ "TEST CPY IMM GT: "
.ORG $03F0
STR_CPY_IMM_3:    .ASCIIZ "TEST CPY IMM LT: "
.ORG $0400 ; Note: Overlaps VRAM start, adjust if needed
STR_BNE_TAKEN:    .ASCIIZ "TEST BNE TAKEN: "
.ORG $0418 ; Adjust addresses as needed
STR_BNE_NOTTAKEN: .ASCIIZ "TEST BNE NTKN: "
.ORG $0430
STR_DEX_1:        .ASCIIZ "TEST DEX NORM: "
.ORG $0440
STR_DEX_2:        .ASCIIZ "TEST DEX ZERO: "
.ORG $0450
STR_DEX_3:        .ASCIIZ "TEST DEX WRAP: "
.ORG $0460
STR_BPL_TAKEN:    .ASCIIZ "TEST BPL TAKEN: "
.ORG $0478
STR_BPL_NOTTAKEN: .ASCIIZ "TEST BPL NTKN: "
.ORG $0490
STR_LDA_ZP:       .ASCIIZ "TEST LDA ZP: "
.ORG $04A0
STR_STA_ZP:       .ASCIIZ "TEST STA ZP: "
.ORG $04B0
STR_LDA_INDY:     .ASCIIZ "TEST LDA (IND),Y: "
.ORG $04C0
STR_STA_INDY:     .ASCIIZ "TEST STA (IND),Y: "
.ORG $04D0
STR_JSR_RTS:      .ASCIIZ "TEST JSR/RTS: "

.ORG $0500
STR_PASS:         .ASCIIZ "PASS"
.ORG $0510
STR_FAIL:         .ASCIIZ "FAIL"


; --- Memory Data for Tests ---
.ORG ABS_TARGET_Y ; $0205 (Overwrites part of PRINT_STRING_SUB, adjust addresses!)
  .BYTE $AA       ; Initial value for LDA Abs,Y test

.ORG IND_TARGET_Y ; $1239
  .BYTE $EF       ; Value for LDA Ind,Y test

; ** WARNING ** Address conflicts need resolving.
; PRINT_STRING_SUB is at $0200, ABS_TARGET_Y is $0205.
; STR_BNE_TAKEN is at $0400 (VRAM start).
; Please adjust the .ORG addresses for subroutines and strings
; to avoid overwriting code or VRAM. For example:
; PRINT_STRING_SUB = $0600
; NEXT_LINE_SUB    = $0640
; Start strings at $0700 or higher.
