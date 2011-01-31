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

    private static final int[] CYCLES = {
        7, 5, 2, 2, 4, 3, 4, 4, 3, 2, 1, 1, 5, 4, 5, 4,
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
    private static final char P_R = BIT5;
    private static final char P_B = BIT4;
    private static final char P_D = BIT3;
    private static final char P_I = BIT2;
    private static final char P_Z = BIT1;
    private static final char P_C = BIT0;

    private Memory memory;
    private char registerA;
    private char registerX;
    private char registerY;
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
        registerS = 0;
        registerP = 0;
        registerPC = 0;

        cycles = 0;
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
     * Get indexed indirect addressing value.
     * @return indexed indirect adressing value
     */
    private int getIndexedIndirect() {
        int address = (registerX + fetch()) & BYTE_MASK;
        int low = ((int) memory.readChar(address + 0)) & BYTE_MASK;
        int high = ((int) memory.readChar(address + 1)) & BYTE_MASK;
        address = (high << BYTE_SHIFT) | low;
        return ((int) memory.readChar(address)) & BYTE_MASK;
    }

    /**
     * Get base page addressing value.
     * @return base page addressing value
     */
    private int getBasePage() {
        int address = fetch() & BYTE_MASK;
        return ((int) memory.readChar(address)) & BYTE_MASK;
    }

    /**
     * Get immediate addressing value.
     * @return immediate addressing value
     */
    private int getImmediate() {
        return fetch();
    }

    /**
     * Get absolute addressing value.
     * @return absolute addressing value
     */
    private int getAbsolute() {
        int low = ((int) fetch()) & BYTE_MASK;
        int high = ((int) fetch()) & BYTE_MASK;
        int address = (high << BYTE_SHIFT) | low;
        return ((int) memory.readChar(address)) & BYTE_MASK;

    }

    /**
     * Execute ORA operation.
     * A = A | value
     * @param value operand
     */
    private void executeOra(final int value) {
        registerA |= value;
        registerP = 0;
        if (0 == registerA) {
            registerP |= P_Z;
        } else if (BIT7 == (registerA & BIT7)) {
            registerP |= P_N;
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
            Log.getLog().error("6502: BRK");
            fetch();
            break;
        case INST_ORA_IND_X:
            executeOra(getIndexedIndirect());
            break;
        case INST_CLE:
            Log.getLog().error("6502: CLear Extend disable (16-bit SP mode)");
            break;
        case INST_SEE:
            Log.getLog().error("6502: SEt Extend disable (8-bit SP mode)");
            break;
        case INST_TSB_BP:
            Log.getLog().error("6502: TSB BP");
            fetch();
            break;
        case INST_ORA_BP:
            executeOra(getBasePage());
            fetch();
            break;
        case INST_ASL_BP:
            Log.getLog().error("6502: ASL BP");
            fetch();
            break;
        case INST_RMB0_BP:
            Log.getLog().error("6502: RMB0 BP");
            fetch();
            break;
        case INST_PHP:
            Log.getLog().error("6502: PHP");
            break;
        case INST_ORA_IMM:
            executeOra(getImmediate());
            break;
        case INST_ASL_ACCUM:
            Log.getLog().error("6502: ASL ACCUM");
            break;
        case INST_TSY:
            Log.getLog().error("6502: TSY");
            break;
        case INST_TSB_ABS:
            Log.getLog().error("6502: TSB ABS");
            fetch();
            fetch();
            break;
        case INST_ORA_ABS:
            executeOra(getAbsolute());
            break;
        case INST_ASL_ABS:
            Log.getLog().error("6502: ASL ABS");
            fetch();
            fetch();
            break;
        case INST_BBR0_BP:
            Log.getLog().error("6502: BBR0 BP");
            fetch();
            fetch();
            break;
        default:
            Log.getLog().error("6502: instruction not implemented");
            break;
        }
    }
}
