import type { HeadRushObject } from "../domain/types";

/** Drum machine as the Flex Prime (FW 5.2.0) reflects it, for the demo without a pedal. */
export const DEMO_DRUMS: HeadRushObject = {
 "meta": {
  "type": "object",
  "properties": {
   "AccQuantise": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "AccentLevel": {
    "maximum": 100.0,
    "minimum": 0.0,
    "type": "number",
    "x-options": {
     "default": 1.0,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "AccentOneshot": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "AccentSel": {
    "maximum": 6.0,
    "minimum": 0.0,
    "type": "integer",
    "x-options": {
     "strings": [
      "Crash 1",
      "Crash 2",
      "Crash 1+2",
      "Splash",
      "Kick & C1",
      "Kick & C2",
      "Open HH"
     ]
    }
   },
   "AutoFill": {
    "type": "boolean",
    "x-options": {
     "default": false
    }
   },
   "AutoFillRate": {
    "maximum": 14.0,
    "minimum": 0.0,
    "type": "integer",
    "x-options": {
     "strings": [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16"
     ]
    }
   },
   "AutoPedal": {
    "type": "boolean",
    "x-options": {
     "default": false
    }
   },
   "AutoTempo": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "Colour": {
    "maximum": 13.0,
    "minimum": 0.0,
    "type": "integer"
   },
   "CountIn": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "CymbVol": {
    "maximum": 100.0,
    "minimum": 0.0,
    "type": "number",
    "x-options": {
     "default": 1.0,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "Drive": {
    "maximum": 100.0,
    "minimum": 0.0,
    "type": "number",
    "x-options": {
     "default": 0.0,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "Fill1Alwd": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "Fill2Alwd": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "Fill3Alwd": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "Fill4Alwd": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "Fill5Alwd": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "Fill6Alwd": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "Fill7Alwd": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "Fill8Alwd": {
    "type": "boolean",
    "x-options": {
     "default": true
    }
   },
   "FillMode": {
    "maximum": 9.0,
    "minimum": 0.0,
    "type": "integer",
    "x-options": {
     "strings": [
      "Rnd-Rob",
      "Random",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8"
     ]
    }
   },
   "FillModeList": {
    "readOnly": true,
    "type": "array"
   },
   "Groove": {
    "maximum": 3.0,
    "minimum": 0.0,
    "type": "integer",
    "x-options": {
     "strings": [
      "1/16 Swing",
      "1/8 Swing",
      "1/4 Swing",
      "Unsteady"
     ]
    }
   },
   "GrooveDepth": {
    "maximum": 100.0,
    "minimum": 0.0,
    "type": "number",
    "x-options": {
     "default": 0.0,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "Intensity": {
    "maximum": 100.0,
    "minimum": -100.0,
    "type": "number",
    "x-options": {
     "default": 0.5,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "KickVol": {
    "maximum": 100.0,
    "minimum": 0.0,
    "type": "number",
    "x-options": {
     "default": 1.0,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "Kit": {
    "type": "string"
   },
   "KitList": {
    "readOnly": true,
    "type": "array"
   },
   "Length": {
    "maximum": 100.0,
    "minimum": 0.0,
    "type": "number",
    "x-options": {
     "default": 1.0,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "LoadedPreset": {
    "type": "string",
    "x-options": {
     "fileType": 14,
     "startPath": "Drum Machine/Presets"
    }
   },
   "LooperFSIndex": {
    "maximum": 5.0,
    "minimum": 0.0,
    "type": "integer",
    "x-options": {
     "strings": [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5"
     ]
    }
   },
   "MissingKit": {
    "type": "string"
   },
   "Mode": {
    "maximum": 2.0,
    "minimum": 0.0,
    "type": "integer",
    "x-options": {
     "strings": [
      "Bridge",
      "Fill",
      "Fill Hold"
     ]
    }
   },
   "PartInfo": {
    "type": "string"
   },
   "Reverb": {
    "maximum": 100.0,
    "minimum": 0.0,
    "type": "number",
    "x-options": {
     "default": 0.10000000149011612,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "SnareVol": {
    "maximum": 100.0,
    "minimum": 0.0,
    "type": "number",
    "x-options": {
     "default": 1.0,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "StyleList": {
    "maximum": 14.0,
    "minimum": 0.0,
    "type": "integer",
    "x-options": {
     "strings": [
      "Blues",
      "Country",
      "Dance",
      "Funk",
      "Jazz",
      "Latin",
      "Metal F",
      "Metal S",
      "Pop",
      "Punk",
      "Reggae",
      "Rock F",
      "Rock M",
      "Rock S",
      "Spares"
     ]
    }
   },
   "StyleVari": {
    "type": "string"
   },
   "StyleVariList": {
    "readOnly": true,
    "type": "array"
   },
   "Tempo": {
    "maximum": 240.0,
    "minimum": 30.0,
    "type": "number",
    "x-options": {
     "default": 0.5,
     "format": "%.2f BPM",
     "grid": 0.009999999776482582
    }
   },
   "Timbre": {
    "maximum": 100.0,
    "minimum": -100.0,
    "type": "number",
    "x-options": {
     "default": 0.5,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "TomVol": {
    "maximum": 100.0,
    "minimum": 0.0,
    "type": "number",
    "x-options": {
     "default": 1.0,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "Tune": {
    "maximum": 100.0,
    "minimum": -100.0,
    "type": "number",
    "x-options": {
     "default": 0.5,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "Vol": {
    "maximum": 100.0,
    "minimum": 0.0,
    "type": "number",
    "x-options": {
     "default": 0.7070000171661377,
     "format": "%.0f %%",
     "grid": 1.0
    }
   },
   "barCount": {
    "maximum": 2147483647.0,
    "minimum": -2147483648.0,
    "readOnly": true,
    "type": "integer"
   },
   "beatCount": {
    "maximum": 2147483647.0,
    "minimum": -2147483648.0,
    "readOnly": true,
    "type": "integer"
   },
   "currentBar": {
    "maximum": 2147483647.0,
    "minimum": -2147483648.0,
    "readOnly": true,
    "type": "integer"
   },
   "currentBeat": {
    "maximum": 2147483647.0,
    "minimum": -2147483648.0,
    "readOnly": true,
    "type": "integer"
   },
   "isFillEngaged": {
    "maximum": 2147483647.0,
    "minimum": -2147483648.0,
    "readOnly": true,
    "type": "integer"
   },
   "isMuted": {
    "maximum": 2147483647.0,
    "minimum": -2147483648.0,
    "readOnly": true,
    "type": "integer"
   },
   "isPlaying": {
    "maximum": 2147483647.0,
    "minimum": -2147483648.0,
    "readOnly": true,
    "type": "integer"
   }
  }
 },
 "value": {
  "AccQuantise": true,
  "AccentLevel": 1.0,
  "AccentOneshot": true,
  "AccentSel": 4,
  "AutoFill": false,
  "AutoFillRate": 2,
  "AutoPedal": false,
  "AutoTempo": true,
  "Colour": 1,
  "CountIn": true,
  "CymbVol": 1.0,
  "Drive": 0.0,
  "Fill1Alwd": true,
  "Fill2Alwd": true,
  "Fill3Alwd": true,
  "Fill4Alwd": true,
  "Fill5Alwd": true,
  "Fill6Alwd": true,
  "Fill7Alwd": true,
  "Fill8Alwd": true,
  "FillMode": 0,
  "FillModeList": [
   "Rnd-Rob",
   "Random",
   "1/3",
   "2/3",
   "3/3"
  ],
  "Groove": 0,
  "GrooveDepth": 0.0,
  "Intensity": 0.5,
  "KickVol": 1.0,
  "Kit": "Rock 1 (A)",
  "KitList": [
   "Rock 1 (A)",
   "Rock 2 (B)",
   "Jazz (A)",
   "Electro (A)"
  ],
  "Length": 1.0,
  "LoadedPreset": "",
  "LooperFSIndex": 0,
  "MissingKit": "",
  "Mode": 0,
  "PartInfo": "",
  "Reverb": 0.10000000149011612,
  "SnareVol": 1.0,
  "StyleList": 6,
  "StyleVari": "Bounce",
  "StyleVariList": [
   "Bounce",
   "Move",
   "Post",
   "Reign",
   "Servant",
   "Six 8",
   "Tech",
   "Warzone",
   "Wicked"
  ],
  "Tempo": 0.7142857313156128,
  "Timbre": 0.5,
  "TomVol": 1.0,
  "Tune": 0.5,
  "Vol": 0.7099999785423279,
  "barCount": 0,
  "beatCount": 0,
  "currentBar": -1,
  "currentBeat": -1,
  "isFillEngaged": 0,
  "isMuted": 0,
  "isPlaying": 0
 }
} as unknown as HeadRushObject;
