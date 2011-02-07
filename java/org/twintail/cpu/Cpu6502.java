/**
 * CPU Emulation Suites for Java
 */
package org.twintail.cpu;

import org.twintail.Log;

/**
 * class Cpu6502
 *
 * This class emulates MOS 6502 processor.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
public final class Cpu6502 implements Cpu {
    private static final int INST_BRK = 0x00;
    private static final int INST_ORA_IND_X = 0x01;
    private static final int INST_CLE = 0x02;
    private static final int INST_SEE = 0x03;
    private static final int INST_TSB_BP = 0x04;
    private static final int INST_ORA_BP = 0x05;
    private static final int INST_ASL_BP = 0x06;
    private static final int INST_RMB0_BP = 0x07;
    private static final int INST_PHP = 0x08;
    private static final int INST_ORA_IMM = 0x09;
    private static final int INST_ASL_ACCUM = 0x0a;
    private static final int INST_TSY = 0x0b;
    private static final int INST_TSB_ABS = 0x0c;
    private static final int INST_ORA_ABS = 0x0d;
    private static final int INST_ASL_ABS = 0x0e;
    private static final int INST_BBR0_BP = 0x0f;
    private static final int INST_BPL_REL = 0x10;
    private static final int INST_ORA_IND_Y = 0x11;
    private static final int INST_ORA_IND_Z = 0x12;
    private static final int INST_BPL_W_REL = 0x13;
    private static final int INST_TRB_BP = 0x14;
    private static final int INST_ORA_BP_X = 0x15;
    private static final int INST_ASL_BP_X = 0x16;
    private static final int INST_RMB1_BP = 0x17;
    private static final int INST_CLC = 0x18;
    private static final int INST_ORA_ABS_Y = 0x19;
    private static final int INST_INC = 0x1a;
    private static final int INST_INZ = 0x1b;
    private static final int INST_TRB_ABS = 0x1c;
    private static final int INST_ORA_ABS_X = 0x1d;
    private static final int INST_ASL_ABS_X = 0x1e;
    private static final int INST_BBR1_BP = 0x1f;
    private static final int INST_JSR_ABS = 0x20;
    private static final int INST_AND_IND_X = 0x21;
    private static final int INST_JSR_IND = 0x22;
    private static final int INST_JSR_ABS_X = 0x23;
    private static final int INST_BIT_BP = 0x24;
    private static final int INST_AND_BP = 0x25;
    private static final int INST_ROL_BP = 0x26;
    private static final int INST_RMB2_BP = 0x27;
    private static final int INST_PLP = 0x28;
    private static final int INST_AND_IMM = 0x29;
    private static final int INST_ROL_ACCUM = 0x2a;
    private static final int INST_TYS = 0x2b;
    private static final int INST_BIT_ABS = 0x2c;
    private static final int INST_AND_ABS = 0x2d;
    private static final int INST_ROL_ABS = 0x2e;
    private static final int INST_BBR2_BP = 0x2f;
    private static final int INST_RMB3_BP = 0x37;
    private static final int INST_BBR3_BP = 0x3f;
    private static final int INST_RMB4_BP = 0x47;
    private static final int INST_BBR4_BP = 0x4f;
    private static final int INST_RMB5_BP = 0x57;
    private static final int INST_BBR5_BP = 0x5f;
    private static final int INST_RMB6_BP = 0x67;
    private static final int INST_BBR6_BP = 0x6f;
    private static final int INST_RMB7_BP = 0x77;
    private static final int INST_BBR7_BP = 0x7f;

    private static final int[] CYCLES = {
        7, 5, 2, 2, 4, 3, 4, 4, 3, 2, 1, 1, 5, 4, 5, 4, // 0x0x
        2, 5, 5, 3, 4, 3, 4, 4, 1, 4, 1, 1, 5, 4, 5, 4, // 0x1x
        5, 5, 7, 7, 4, 3, 4, 4, 3, 2, 1, 1, 5, 4, 5, 4, // 0x2x
        2, 5, 5, 3, 4, 3, 4, 4, 1, 4, 1, 1, 5, 4, 5, 4, // 0x3x
        5, 5, 2, 2, 4, 3, 4, 4, 3, 2, 1, 1, 3, 4, 5, 4, // 0x4x
        2, 5, 5, 3, 4, 3, 4, 4, 1, 4, 3, 1, 4, 4, 5, 4, // 0x5x
        4, 5, 7, 5, 3, 3, 4, 4, 3, 2, 1, 1, 5, 4, 5, 4, // 0x6x
        2, 5, 5, 3, 3, 3, 4, 4, 2, 4, 3, 1, 5, 4, 5, 4, // 0x7x
        2, 5, 6, 3, 3, 3, 3, 4, 1, 2, 1, 4, 4, 4, 4, 4, // 0x8x
        2, 5, 5, 3, 3, 3, 3, 4, 1, 4, 1, 4, 4, 4, 4, 4, // 0x9x
        2, 5, 2, 2, 3, 3, 3, 4, 1, 2, 1, 4, 4, 4, 4, 4, // 0xAx
        2, 5, 5, 3, 3, 3, 3, 4, 1, 4, 1, 4, 4, 4, 4, 4, // 0xBx
        2, 5, 2, 6, 3, 3, 4, 4, 1, 2, 1, 7, 4, 4, 5, 4, // 0xCx
        2, 5, 5, 3, 3, 3, 4, 4, 1, 4, 3, 3, 4, 4, 5, 4, // 0xDx
        2, 5, 6, 6, 3, 3, 4, 4, 1, 2, 1, 6, 4, 4, 5, 4, // 0xEx
        2, 5, 5, 3, 5, 3, 4, 4, 1, 4, 3, 3, 7, 4, 5, 4, // 0xFx
    };

    private static final int BYTE_MASK = 0xff;
    private static final int WORD_MASK = 0xffff;
    private static final int BYTE_SHIFT = 8;

    private static final char BIT7 = (char) 0x80;
    private static final char BIT6 = (char) 0x40;
    private static final char BIT5 = (char) 0x20;
    private static final char BIT4 = (char) 0x10;
    private static final char BIT3 = (char) 0x08;
    private static final char BIT2 = (char) 0x04;
    private static final char BIT1 = (char) 0x02;
    private static final char BIT0 = (char) 0x01;

    private static final char P_N = BIT7;
    private static final char P_V = BIT6;
    private static final char P_E = BIT5;
    private static final char P_B = BIT4;
    private static final char P_D = BIT3;
    private static final char P_I = BIT2;
    private static final char P_Z = BIT1;
    private static final char P_C = BIT0;

    private Memory memory;
    private char registerA;
    private char registerX;
    private char registerY;
    private char registerZ;
    private char registerS;
    private char registerP;
    private short registerPC;

    private int cycles;

    /**
     * Class constructor.
     */
    public Cpu6502() {
        init();
    }

    /**
     * Set memory access object.
     * @param newMemory Memory object to set
     */
    public void setMemory(final Memory newMemory) {
        memory = newMemory;
    }

    /**
     * Initialize the processor.
     */
    public void init() {
        registerA = 0;
        registerX = 0;
        registerY = 0;
        registerZ = 0;
        registerS = 0;
        registerP = 0;
        registerPC = 0;

        cycles = 0;
    }

    /**
     * Skip a byte.
     */
    private void skip() {
        registerPC++;
    }

    /**
     * Fetch a byte data from PC.
     * @return read data
     */
    private int fetch() {
        int data = memory.readChar(((int) registerPC) & WORD_MASK);
        registerPC++;
        return data & BYTE_MASK;
    }

    /**
     * Get indexed indirect address by X.
     * @return indexed indirect address
     */
    private int getIndexedIndirectAddress() {
        int address = (registerX + fetch()) & BYTE_MASK;
        int low = ((int) memory.readChar(address + 0)) & BYTE_MASK;
        int high = ((int) memory.readChar(address + 1)) & BYTE_MASK;
        address = (high << BYTE_SHIFT) | low;
        return address;
    }

    /**
     * Get indirect indexed address by Y or Z.
     * @param index address index
     * @return indirect address
     */
    private int getIndirectIndexedAddress(final int index) {
        int address = fetch() & BYTE_MASK;
        int low = ((int) memory.readChar(address + 0)) & BYTE_MASK;
        int high = ((int) memory.readChar(address + 1)) & BYTE_MASK;
        address = (high << BYTE_SHIFT) | low;
        address = (address + index) & WORD_MASK;
        return address;
    }

    /**
     * Get base page address.
     * @param index address index
     * @return base page address
     */
    private int getBasePageAddress(final int index) {
        int address = fetch() & BYTE_MASK;
        address = (address + index) & WORD_MASK;
        return address;
    }

    /**
     * Get absolute address.
     * @param index address index
     * @return absolute address
     */
    private int getAbsoluteAddress(final int index) {
        int low = ((int) fetch()) & BYTE_MASK;
        int high = ((int) fetch()) & BYTE_MASK;
        int address = (high << BYTE_SHIFT) | low;
        address = (address + index) & WORD_MASK;
        return address;
    }

    /**
     * Get relative address.
     * @return relative address
     */
    private int getRelativeAddress() {
        char offset = (char) fetch();
        return (registerPC + offset) & WORD_MASK;
    }

    /**
     * Get relative address.
     * @return relative address
     */
    private int getWordRelativeAddress() {
        int low = ((int) fetch()) & BYTE_MASK;
        int high = ((int) fetch()) & BYTE_MASK;
        int offset = (short) ((high << BYTE_SHIFT) | low);
        return (registerPC + offset) & WORD_MASK;
    }

    /**
     * Get indexed indirect addressing value by X.
     * @return indexed indirect addressing value
     */
    private int getIndexedIndirectValue() {
        int address = getIndexedIndirectAddress();
        return ((int) memory.readChar(address)) & BYTE_MASK;
    }

    /**
     * Get indexed indirect addressing value by Y or Z.
     * @param index offset value (Y or Z)
     * @return indexed indirect addressing value
     */
    private int getIndirectIndexedValue(final int index) {
        int address = getIndirectIndexedAddress(index);
        return ((int) memory.readChar(address)) & BYTE_MASK;
    }

    /**
     * Get base page addressing value.
     * @param index address index
     * @return base page addressing value
     */
    private int getBasePageValue(final int index) {
        int address = getBasePageAddress(index);
        return ((int) memory.readChar(address)) & BYTE_MASK;
    }

    /**
     * Get absolute addressing value.
     * @param index address index
     * @return absolute addressing value
     */
    private int getAbsoluteValue(final int index) {
        int address = getAbsoluteAddress(index);
        return ((int) memory.readChar(address)) & BYTE_MASK;

    }

    /**
     * Get immediate addressing value.
     * @return immediate addressing value
     */
    private int getImmediateValue() {
        return fetch();
    }

    /**
     * Set status flags on P register.
     * @param flags flags to set
     */
    private void setStatus(final int flags) {
        registerP |= flags;
    }

    /**
     * Reset status flags on P register.
     * @param flags flags to reset
     */
    private void resetStatus(final int flags) {
        registerP &= ~flags;
    }

    /**
     * Execute ORA operation.
     * A = A | value
     * @param value operand
     */
    private void executeOra(final int value) {
        registerA |= value;
        resetStatus(P_Z | P_N);
        if (0 == registerA) {
            setStatus(P_Z);
        } else if (0 != (registerA & BIT7)) {
            setStatus(P_N);
        }
    }

    /**
     * Execute ASL operation.
     * @param address operand address
     */
    private void executeAsl(final int address) {
        int value = memory.readChar(address);
        resetStatus(P_N | P_Z | P_C);
        if (0 != (value & BIT7)) {
            setStatus(P_C);
        }
        value = (value << 1) & BYTE_MASK;
        if (0 == value) {
            setStatus(P_Z);
        } else if (0 != (value & BIT7)) {
            setStatus(P_N);
        }
        memory.writeChar(address, (char) value);
    }

    /**
     * Execute ASL operation to A.
     */
    private void executeAslA() {
        resetStatus(P_N | P_Z | P_C);
        if (0 != (registerA & BIT7)) {
            setStatus(P_C);
        }
        registerA = (char) ((registerA << 1) & BYTE_MASK);
        if (0 == registerA) {
            setStatus(P_Z);
        } else if (0 != (registerA & BIT7)) {
            setStatus(P_N);
        }
    }

    /**
     * Execute TSB operation.
     * This operation realizes test and set bit.
     * @param address operand address
     */
    private void executeTsb(final int address) {
        int result = registerA | memory.readChar(address);
        if (0 == result) {
            setStatus(P_Z);
        } else {
            resetStatus(P_Z);
        }
        memory.writeChar(address, (char) result);
    }

    /**
     * Execute TRB operation.
     * This operation realizes test and reset bit.
     * @param address operand address
     */
    private void executeTrb(final int address) {
        int result = ~registerA & memory.readChar(address);
        if (0 == result) {
            setStatus(P_Z);
        } else {
            resetStatus(P_Z);
        }
        memory.writeChar(address, (char) result);
    }

    /**
     * Execute RMB operation.
     * @param address operand address
     * @param mask bit mask to reset
     */
    private void executeRmb(final int address, final int mask) {
        int value = memory.readChar(address);
        value = value & ~mask;
        memory.writeChar(address, (char) value);
    }

    /**
     * Execute PH* operation.
     * @param value operand
     */
    private void executePh(final int value) {
        memory.writeChar(registerS, (char) value);
        registerS--;
    }

    /**
     * Execute TS* operation.
     * @return result
     */
    private char executeTs() {
        resetStatus(P_N | P_Z);
        if (0 == registerS) {
            setStatus(P_Z);
        } else if (0 != (registerS & BIT7)) {
            setStatus(P_N);
        }
        return registerS;
    }

    /**
     * Execute INC operation.
     * @param source operand
     * @return result
     */
    private char executeInc(final char source) {
        char result = (char) (source + 1);
        resetStatus(P_N | P_Z);
        if (0 == result) {
            setStatus(P_Z);
        } else if (0 != (result & BIT7)) {
            setStatus(P_N);
        }
        return result;
    }

    /**
     * Execute BBR operation.
     * @param mask bit mask to test
     * @param address address to test
     * @param target branch target
     */
    public void executeBbr(final int mask, final int address,
            final int target) {
        int value = memory.readChar(address);
        if (0 == (mask & value)) {
            registerPC = (short) target;
        }
    }

    /**
     * Execute B** operation.
     * @param taken execute branch on true
     * @param target branch target
     */
    public void executeBxx(final boolean taken, final int target) {
        if (taken) {
            registerPC = (short) target;
        }
    }

    /**
     * Execute one step.
     */
    public void runStep() {
        int inst = fetch();
        cycles += CYCLES[inst];
        switch (inst) {
        case INST_BRK:
            setStatus(P_B);
            Log.getLog().info("6502 not impl: BRK");
            skip(); // TODO: 65CE02 data-sheet say this is two bytes operation.
            break;
        case INST_ORA_IND_X:
            executeOra(getIndexedIndirectValue());
            break;
        case INST_CLE:
            resetStatus(P_E);
            Log.getLog().warn(
                    "6502 not impl: CLear Extend disable (16-bit SP mode)");
            break;
        case INST_SEE:
            setStatus(P_E);
            Log.getLog().error(
                    "6502 not impl: SEt Extend disable (8-bit SP mode)");
            break;
        case INST_TSB_BP:
            executeTsb(getBasePageAddress(0));
            break;
        case INST_ORA_BP:
            executeOra(getBasePageValue(0));
            break;
        case INST_ASL_BP:
            executeAsl(getBasePageAddress(0));
            break;
        case INST_RMB0_BP:
            executeRmb(getBasePageAddress(0), BIT0);
            break;
        case INST_PHP:
            executePh(registerP);
            break;
        case INST_ORA_IMM:
            executeOra(getImmediateValue());
            break;
        case INST_ASL_ACCUM:
            executeAslA();
            break;
        case INST_TSY:
            registerY = executeTs();
            break;
        case INST_TSB_ABS:
            executeTsb(getAbsoluteAddress(0));
            break;
        case INST_ORA_ABS:
            executeOra(getAbsoluteValue(0));
            break;
        case INST_ASL_ABS:
            executeAsl(getAbsoluteAddress(0));
            break;
        case INST_BBR0_BP:
            executeBbr(BIT0, getBasePageAddress(0), getRelativeAddress());
            break;
        case INST_BPL_REL:
            executeBxx(0 == (registerP & P_N), getRelativeAddress());
            break;
        case INST_ORA_IND_Y:
            executeOra(getIndirectIndexedValue(registerY));
            break;
        case INST_ORA_IND_Z:
            executeOra(getIndirectIndexedValue(registerZ));
            break;
        case INST_BPL_W_REL:
            executeBxx(0 == (registerP & P_N), getWordRelativeAddress());
            break;
        case INST_TRB_BP:
            executeTrb(getBasePageAddress(0));
            break;
        case INST_ORA_BP_X:
            executeOra(getBasePageValue(registerX));
            break;
        case INST_ASL_BP_X:
            executeAsl(getBasePageAddress(registerX));
            break;
        case INST_RMB1_BP:
            executeRmb(getBasePageAddress(0), BIT1);
            break;
        case INST_CLC:
            resetStatus(P_C);
            break;
        case INST_ORA_ABS_Y:
            executeOra(getAbsoluteValue(registerY));
            break;
        case INST_INC:
            registerA = executeInc(registerA);
            break;
        case INST_INZ:
            registerZ = executeInc(registerZ);
            break;
        case INST_TRB_ABS:
            executeTrb(getAbsoluteAddress(0));
            break;
        case INST_ORA_ABS_X:
            executeOra(getAbsoluteValue(registerX));
            break;
        case INST_ASL_ABS_X:
            executeAsl(getAbsoluteAddress(registerX));
            break;
        case INST_BBR1_BP:
            executeBbr(BIT1, getBasePageAddress(0), getRelativeAddress());
            break;
        case INST_RMB2_BP:
            executeRmb(getBasePageAddress(0), BIT2);
            break;
        case INST_BBR2_BP:
            executeBbr(BIT2, getBasePageAddress(0), getRelativeAddress());
            break;
        case INST_RMB3_BP:
            executeRmb(getBasePageAddress(0), BIT3);
            break;
        case INST_BBR3_BP:
            executeBbr(BIT3, getBasePageAddress(0), getRelativeAddress());
            break;
        case INST_RMB4_BP:
            executeRmb(getBasePageAddress(0), BIT4);
            break;
        case INST_BBR4_BP:
            executeBbr(BIT4, getBasePageAddress(0), getRelativeAddress());
            break;
        case INST_RMB5_BP:
            executeRmb(getBasePageAddress(0), BIT5);
            break;
        case INST_BBR5_BP:
            executeBbr(BIT5, getBasePageAddress(0), getRelativeAddress());
            break;
        case INST_RMB6_BP:
            executeRmb(getBasePageAddress(0), BIT6);
            break;
        case INST_BBR6_BP:
            executeBbr(BIT6, getBasePageAddress(0), getRelativeAddress());
            break;
        case INST_RMB7_BP:
            executeRmb(getBasePageAddress(0), BIT7);
            break;
        case INST_BBR7_BP:
            executeBbr(BIT7, getBasePageAddress(0), getRelativeAddress());
            break;
        default:
            Log.getLog().error("6502: instruction not implemented");
            break;
        }
    }
}
