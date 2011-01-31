/**
 * CPU Emulation Suites for Java
 */
package org.twintail.cpu;

/**
 * interface Cpu
 *
 * This interface provides a processor interfaces.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
public interface Cpu {
    /**
     * Set memory access object.
     * @param memory Memory object to set
     */
    void setMemory(Memory memory);

    /**
     * Initialize the processor.
     */
    void init();

    /**
     * Execute one step.
     */
    void runStep();
}
