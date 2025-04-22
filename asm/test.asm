; filepath: c:\source\cpu-custom\asm\test_suite.asm
; Assembly program to test various implemented opcodes

; --- Constants ---
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

; --- Code Segment ---
.ORG $0000

START:
  ; Test LDX Immediate
  LDX #$55          ; Load X with 0x55

  ; Test STX Zero Page
  STX ZP_STX_TARGET ; Store X (0x55) to address 0x30

  ; Test ADC Immediate (various cases)
  LDA #$20
  CLC             ; Clear Carry (assume CLC exists or manually clear P)
  ADC #$10          ; A = 0x20 + 0x10 + 0 = 0x30
  SEC             ; Set Carry (assume SEC exists or manually set P)
  ADC #$10          ; A = 0x30 + 0x10 + 1 = 0x41
  LDA #$01
  CLC
  ADC #$7F          ; A = 0x01 + 0x7F + 0 = 0x80 (Overflow, Negative)
  LDA #$80
  CLC
  ADC #$80          ; A = 0x80 + 0x80 + 0 = 0x00 (Carry, Zero, Overflow)
  LDA #$01
  CLC
  ADC #$FF          ; A = 0x01 + 0xFF + 0 = 0x00 (Carry, Zero)

  ; Test LDY Immediate
  LDY #$88          ; Load Y with 0x88 (Negative)

  ; Test LDA/STA Absolute, Y
  LDY #$05          ; Set Y for Abs,Y addressing
  LDA ABS_BASE_ADDR, Y ; Load A from 0x0200 + 0x05 = 0x0205
  LDA #$BB          ; Load A with value to store
  STA ABS_BASE_ADDR, Y ; Store A to 0x0200 + 0x05 = 0x0205

  ; Test INY
  LDY #$05
  INY             ; Y = 0x06
  LDY #$FF
  INY             ; Y = 0x00 (Zero flag set)

  ; Test CPY Immediate
  LDY #$10
  CPY #$10          ; Compare Y (0x10) with 0x10 (Z=1, C=1)
  CPY #$05          ; Compare Y (0x10) with 0x05 (Z=0, C=1, N=0)
  CPY #$80          ; Compare Y (0x10) with 0x80 (Z=0, C=0, N=1)

  ; Test BNE
  LDA #$01          ; Ensure Z=0
  CMP #$02
  BNE BNE_TARGET    ; Branch should be taken (Z=0)
NOP_BNE:
  NOP             ; Should be skipped
BNE_TARGET:
  LDA #$01          ; Ensure Z=1
  CMP #$01
  BNE NOP_BNE       ; Branch should NOT be taken (Z=1)

  ; Test DEX
  LDX #$05
  DEX             ; X = 0x04
  DEX             ; X = 0x03
  LDX #$01
  DEX             ; X = 0x00 (Zero flag set)
  DEX             ; X = 0xFF (Negative flag set)

  ; Test BPL
  LDA #$7F          ; Ensure N=0
  CMP #$00
  BPL BPL_TARGET    ; Branch should be taken (N=0)
NOP_BPL:
  NOP             ; Should be skipped
BPL_TARGET:
  LDA #$80          ; Ensure N=1
  CMP #$00
  BPL NOP_BPL       ; Branch should NOT be taken (N=1)

  ; Test LDA/STA Zero Page
  LDA #$AB
  STA ZP_TARGET     ; Store 0xAB to address 0x42
  LDA #$00          ; Clear A
  LDA ZP_TARGET     ; Load A from 0x42 (should be 0xAB)
  STA ZP_STA_TARGET ; Store 0xAB to address 0x55

  ; Test LDA/STA Indirect Indexed Y
  ; Setup pointers in Zero Page first
  LDA #<(IND_BASE_ADDR) ; Low byte of 0x1234
  STA ZP_PTR1
  LDA #>(IND_BASE_ADDR) ; High byte of 0x1234
  STA ZP_PTR1+1

  LDA #<(IND_STA_BASE)  ; Low byte of 0x4567
  STA ZP_PTR2
  LDA #>(IND_STA_BASE)  ; High byte of 0x4567
  STA ZP_PTR2+1

  ; Execute LDA (ZP), Y
  LDY #$05
  LDA (ZP_PTR1), Y  ; Load A from (0x1234) + 0x05 = 0x1239

  ; Execute STA (ZP), Y
  LDY #$0A
  LDA #$FE          ; Value to store
  STA (ZP_PTR2), Y  ; Store A to (0x4567) + 0x0A = 0x4571

  ; Test JSR/RTS
  JSR SUBROUTINE_ADDR ; Jump to subroutine at 0x0300

AFTER_SUBROUTINE:
  NOP             ; Should return here

  ; Infinite loop
DONE:
  JMP DONE

; --- Subroutine ---
.ORG SUBROUTINE_ADDR ; 0x0300
  ; Simple subroutine - just returns
  RTS

; --- Data Segment (for testing memory access) ---
; Place some data where the tests expect it
.ORG ABS_TARGET_Y ; 0x0205
  .BYTE $AA       ; Initial value for LDA Abs,Y test

.ORG IND_TARGET_Y ; 0x1239
  .BYTE $EF       ; Value for LDA Ind,Y test

; No initial value needed for STA targets (0x0205, 0x4571) as tests write there.
; No initial value needed for ZP targets (0x30, 0x42, 0x55) as tests write there.
