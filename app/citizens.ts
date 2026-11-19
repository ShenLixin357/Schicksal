export type Citizen = { id: string; username: string; name: string; codename: string; office: string; accent: string; markColor: string; motif: string; locked?: boolean };

export const CITIZENS: Citizen[] = [
  { id: "amberina", username: "宇宙霸主", name: "Amberina von Schicksal", codename: "宇宙霸主", office: "President of the First Empire", accent: "#f3c969", markColor: "#F3ED87", motif: "snow" },
  { id: "zxy", username: "No.2", name: "zxy", codename: "No.2", office: "Citizen of the First Empire", accent: "#d95d52", markColor: "#f05f55", motif: "flame" },
  { id: "truth", username: "我说 真的", name: "我说 真的", codename: "我说 真的", office: "Core Member of the Legislative Committee", accent: "#eecf58", markColor: "#ffd84f", motif: "lightning" },
  { id: "kaito", username: "怪盗 基德", name: "怪盗 基德", codename: "怪盗 基德", office: "Citizen of the First Empire", accent: "#65cae9", markColor: "#65cae9", motif: "water" },
  { id: "harry", username: "哈利 波特", name: "哈利 波特", codename: "哈利 波特", office: "Citizen of the First Empire", accent: "#a99ce6", markColor: "#a99ce6", motif: "wind" },
  { id: "sealed-6", username: "Citizen No. 6", name: "Citizen No. 6", codename: "身份待补", office: "Sealed Record", accent: "#48ad83", markColor: "#48ad83", motif: "sealed", locked: true },
  { id: "sealed-7", username: "Citizen No. 7", name: "Citizen No. 7", codename: "身份待补", office: "Sealed Record", accent: "#ef9148", markColor: "#ef9148", motif: "sealed", locked: true },
  { id: "sealed-8", username: "Citizen No. 8", name: "Citizen No. 8", codename: "身份待补", office: "Sealed Record", accent: "#e982ad", markColor: "#e982ad", motif: "sealed", locked: true },
];
