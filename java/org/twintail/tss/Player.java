/**
 * T'SoundSystem for Java
 */
package org.twintail.tss;

/**
 * interface Player
 * 
 * This interface provides periodical device control interfaces
 * to Channel object.
 * @author Takashi Toyoshima <toyoshim@gmail.com>
 */
public interface Player {
	/**
	 * Channel reach to periodical call back point. 
	 */
	void updateDevice();
}
