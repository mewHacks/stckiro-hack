"""Generates music + SFX with ffmpeg only (no downloads, no licensing). Run: python3 capture/audio.py"""
import subprocess, os
A = "public/audio/"
os.makedirs(A, exist_ok=True)
def ff(*a): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], check=True)

# --- music: warm ambient pads (Cmaj7 · Am7 · Fmaj7 · G6, 11.25 s each) + soft plucked arpeggio ---
CH = [[130.81, 196.0, 261.63, 329.63, 493.88], [110.0, 164.81, 261.63, 329.63, 392.0],
      [87.31, 174.61, 261.63, 349.23, 440.0], [98.0, 196.0, 246.94, 293.66, 329.63]]
ARP = [[523.25, 659.25, 783.99, 987.77], [440.0, 523.25, 659.25, 783.99], [523.25, 698.46, 880.0, 1046.5], [587.33, 783.99, 987.77, 1174.66]]
L = 14.0
for i, (notes, arp) in enumerate(zip(CH, ARP)):
    pad = "+".join(f"0.07*sin(2*PI*{f}*t)+0.05*sin(2*PI*{f*1.004}*t)" for f in notes)
    pad = f"({pad})*(0.75+0.25*sin(2*PI*0.18*t))"
    seq = "if(lt(mod(t,3),0.75),{a},if(lt(mod(t,3),1.5),{b},if(lt(mod(t,3),2.25),{c},{d})))".format(a=arp[0], b=arp[1], c=arp[2], d=arp[3])
    pluck = f"0.11*sin(2*PI*({seq})*t)*exp(-5*mod(t,0.75))*min(1,mod(t,0.75)*80)"
    ff("-f", "lavfi", "-i", f"aevalsrc='{pad}+{pluck}':s=44100:d={L}", "-af", f"afade=t=in:d=3,afade=t=out:st={L-3}:d=3", f"/private/tmp/claude-501/ch{i}.wav")
# stitch 16 chords (4 loops) overlapping by 2.75 s
inputs, filt, n = [], [], 0
for loop in range(4):
    for i in range(4):
        inputs += ["-i", f"/private/tmp/claude-501/ch{i}.wav"]
        filt.append(f"[{n}:a]adelay={int(n*11250)}|{int(n*11250)}[a{n}]")
        n += 1
mix = "".join(f"[a{k}]" for k in range(n)) + f"amix=inputs={n}:normalize=0,aecho=0.8:0.85:70|140:0.35|0.2,lowpass=f=3200,afade=t=in:d=2,afade=t=out:st=176:d=4,atrim=0:182,loudnorm=I=-20:TP=-2[out]"
ff(*inputs, "-filter_complex", ";".join(filt) + ";" + mix, "-map", "[out]", A + "music.wav")

# --- sfx ---
ff("-f", "lavfi", "-i", "anoisesrc=d=0.9:c=pink:a=0.6", "-af", "highpass=f=250,lowpass=f=5000,afade=t=in:d=0.35,afade=t=out:st=0.3:d=0.6,volume=1.4", A + "whoosh.wav")
ff("-f", "lavfi", "-i", "aevalsrc='0.35*sin(2*PI*1318.5*t)*exp(-4*t)+0.18*sin(2*PI*2637*t)*exp(-6*t)':s=44100:d=1.4", A + "ding.wav")
ff("-f", "lavfi", "-i", "aevalsrc='0.4*sin(2*PI*2200*t)*exp(-70*t)':s=44100:d=0.12", A + "tick.wav")
ff("-f", "lavfi", "-i", "aevalsrc='0.95*sin(2*PI*(62-30*t)*t)*exp(-4.5*t)+0.2*random(0)*exp(-18*t)':s=44100:d=1.4", "-af", "lowpass=f=400", A + "impact.wav")
ff("-f", "lavfi", "-i", "anoisesrc=d=3.2:c=white:a=0.5", "-af", "bandpass=f=1800:w=2000,afade=t=in:d=3,afade=t=out:st=3:d=0.2,volume=0.9", A + "riser.wav")
print("audio ok", os.listdir(A))
