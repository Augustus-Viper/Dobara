import { C } from "@/lib/constants";
import Motif from "./Motif";

export default function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px" }}>
      <div style={{ flex: 1, height: 1, background: C.line }} />
      <Motif size={13} />
      <div style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}
