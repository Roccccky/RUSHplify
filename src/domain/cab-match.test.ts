import { describe, expect, it } from "vitest";
import { captureRole, matchCabIr, nextCabIr } from "./cab-match";
import type { CloudTone } from "./types";

const IRS = [
  "Impulse Responses/Choptones/CT-Bogie412V30-57421.wav",
  "Impulse Responses/Choptones/CT-Brit412G12M-421160.wav",
  "Impulse Responses/Choptones/CT-Vocs212AlnBL-58.wav",
  "Impulse Responses/Choptones/CT-Fend312EMFDS-4217B.wav",
  "Impulse Responses/Marty/MESA RECTO V30.wav",
  "Impulse Responses/Marty/Marshall 1960BV - V30 1 SM58.wav",
];

const tone = (title: string, extra: Partial<CloudTone> = {}): CloudTone => ({ id: title, title, author: "", description: "", captureType: "amp", detectedType: "amp", tags: [], rating: 0, downloads: 0, source: "Tone3000", imageColor: "", ...extra });

describe("cab match", () => {
  it("picks a cab of the same make, own folder first", () => {
    expect(matchCabIr(tone("Mesa Dual Rectifier modern red"), IRS)).toBe("Impulse Responses/Marty/MESA RECTO V30.wav");
    expect(matchCabIr(tone("JCM800 2203 crunch"), IRS)).toBe("Impulse Responses/Marty/Marshall 1960BV - V30 1 SM58.wav");
    expect(matchCabIr(tone("AC30 top boost"), IRS)).toBe("Impulse Responses/Choptones/CT-Vocs212AlnBL-58.wav");
    expect(matchCabIr(tone("Clean", { metadata: { filters: "Fender" } }), IRS)).toBe("Impulse Responses/Choptones/CT-Fend312EMFDS-4217B.wav");
  });

  it("prefers the user's own folder by any name, then Matched Cabs, then Choptones", () => {
    const factory = [
      "Impulse Responses/Choptones/CT-Fend312EMFDS-4217B.wav",
      "Impulse Responses/Matched Cabs/65 Black SR.wav",
      "Impulse Responses/Matched Cabs/64 Fox AC30.wav",
      "Impulse Responses/Matched Cabs/68 Plexiglas.wav",
      "Impulse Responses/Matched Cabs/92 Flathill Dual.wav",
    ];
    expect(matchCabIr(tone("Fender Super Reverb '65 Clean"), factory)).toBe("Impulse Responses/Matched Cabs/65 Black SR.wav");
    expect(matchCabIr(tone("AC30 top boost"), factory)).toBe("Impulse Responses/Matched Cabs/64 Fox AC30.wav");
    expect(matchCabIr(tone("Plexi 1959 cranked"), factory)).toBe("Impulse Responses/Matched Cabs/68 Plexiglas.wav");
    expect(matchCabIr(tone("Mesa Dual Rectifier"), factory)).toBe("Impulse Responses/Matched Cabs/92 Flathill Dual.wav");
    expect(matchCabIr(tone("Fender Twin"), [...factory, "Impulse Responses/Studio Kim/Fender 2x12 Jensen.wav"])).toBe("Impulse Responses/Studio Kim/Fender 2x12 Jensen.wav");
  });

  it("falls back to a V30 4x12 for high gain and keeps the IR otherwise", () => {
    expect(matchCabIr(tone("Unknown boutique", { tags: ["high-gain"] }), IRS)).toMatch(/V30|412/);
    expect(matchCabIr(tone("Unknown boutique clean"), IRS)).toBe("Impulse Responses/Choptones/CT-Brit412G12M-421160.wav");
    expect(matchCabIr(tone("Mesa"), [])).toBeNull();
  });

  it("lets the IR follow every new amp, but keeps an IR the user picked", () => {
    const lib = [
      "Impulse Responses/Matched Cabs/92 Flathill Dual.wav",
      "Impulse Responses/Matched Cabs/65 Black SR.wav",
      "Impulse Responses/Matched Cabs/05 Redhot AD30TC.wav",
      "Impulse Responses/Matched Cabs/68 Plexiglas.wav",
    ];
    const mesa = nextCabIr(tone("Mesa Dual Rectifier"), lib, "");
    expect(mesa).toBe("Impulse Responses/Matched Cabs/92 Flathill Dual.wav");
    // RUSHplify picked it, so the next amp brings its own cab: Mesa → Fender → Orange.
    const fender = nextCabIr(tone("Fender Twin clean"), lib, "92 Flathill Dual.wav", mesa!);
    expect(fender).toBe("Impulse Responses/Matched Cabs/65 Black SR.wav");
    expect(nextCabIr(tone("Orange Rockerverb"), lib, "/Impulse Responses/Matched Cabs/65 Black SR.wav", fender!)).toBe("Impulse Responses/Matched Cabs/05 Redhot AD30TC.wav");
    // Same cab already in → nothing to do.
    expect(nextCabIr(tone("Fender Deluxe"), lib, "65 Black SR.wav", fender!)).toBeNull();
    // The user's own pick of the same make, or for an amp of unknown make, stays.
    expect(nextCabIr(tone("Plexi 1959"), lib, "Impulse Responses/Studio/Marshall 1960 G12M.wav")).toBeNull();
    expect(nextCabIr(tone("Boutique clean"), lib, "Impulse Responses/Studio/My Cab.wav")).toBeNull();
    // …unless it is clearly of another make.
    expect(nextCabIr(tone("Fender Twin"), lib, "Impulse Responses/Studio/Mesa 4x12.wav")).toBe("Impulse Responses/Matched Cabs/65 Black SR.wav");
  });

  it("always finds some IR for another user's pedal", () => {
    const factoryOnly = ["Impulse Responses/Matched Cabs/59 Tweed Deluxe.wav", "Impulse Responses/Choptones/CT-Brit412V30-160121.wav"];
    expect(matchCabIr(tone("Mystery amp"), factoryOnly)).not.toBeNull();
    expect(matchCabIr(tone("Mystery amp", { tags: ["metal"] }), factoryOnly)).toBe("Impulse Responses/Choptones/CT-Brit412V30-160121.wav");
  });

  it("knows full rigs from amps", () => {
    expect(captureRole(tone("x"))).toBe("amp");
    expect(captureRole(tone("x", { detectedType: "full-rig" as CloudTone["detectedType"] }))).toBe("fullrig");
    expect(captureRole(tone("x", { gear: "outboard" }))).toBe("outboard");
  });
});
