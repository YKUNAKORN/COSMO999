// Round commentary generator ("roast the loser"), ported from the legacy
// prototype's generateRoundCommentary (reference/legacy-prototype.sanitized.html
// L816-884). Pure function: no DOM, no Firebase - saveRound calls this once
// per confirmed round and stores the result on the history entry. Every line
// has its emoji stripped per the no-emoji rule; render an icon (e.g. lucide
// Flame) at the call site instead.
import type { HistoryEntry, Player } from "@/types/models";

const ROAST_CHANCE = 1.0;

function playerName(players: Player[], id: string): string {
  return players.find((player) => player.id === id)?.name ?? "ใครบางคน";
}

/**
 * Randomly produce a roast line for the round just played, or "" to show
 * nothing. `priorHistory` is only used to detect a comeback (the round's
 * winner lost their most recent prior round).
 */
export function generateRoundCommentary(
  netScores: Record<string, number>,
  players: Player[],
  priorHistory: HistoryEntry[],
): string {
  if (Math.random() > ROAST_CHANCE) return "";

  let maxScore = -Infinity;
  let minScore = Infinity;
  for (const score of Object.values(netScores)) {
    if (score > maxScore) maxScore = score;
    if (score < minScore) minScore = score;
  }

  const winnerIds = Object.entries(netScores)
    .filter(([, score]) => score === maxScore)
    .map(([id]) => id);
  const loserIds = Object.entries(netScores)
    .filter(([, score]) => score === minScore)
    .map(([id]) => id);

  const winnerName = winnerIds.length > 0 ? playerName(players, winnerIds[0]) : "";
  const loserName = loserIds.length > 0 ? playerName(players, loserIds[0]) : "";

  // Comeback: the current winner's most recent prior round was a loss.
  // Sort by numeric id (matchId is Date.now().toString()) descending.
  const sortedHistory = [...priorHistory].sort((a, b) => Number(b.id) - Number(a.id));
  let comeback = false;
  if (sortedHistory.length > 0 && winnerIds.length > 0) {
    const prevScore = sortedHistory[0].playerScores[winnerIds[0]];
    if (prevScore !== undefined && prevScore < 0 && maxScore > 0) comeback = true;
  }

  const comments: string[] = [];

  if (comeback) {
    comments.push(
      `นึกว่าเสาเข็มทรุดไปแล้ว! ${winnerName} ดีดตัวกลับมาผงาดเฉย!`,
      `ตายวงแรกแล้วฟื้นมาแชมป์เฉย! ${winnerName} คัมแบ็กแบบงงๆ`,
      `ตัวตึงคืนชีพ! ${winnerName} โดนไปรอบก่อน รอบนี้กลับมาแบกวงเฉย!`,
      `โฮ่งมาก! ${winnerName} ลบตราบาปรอบก่อน คืนฟอร์มทำถึงสุดๆ!`,
      `เริ่ดเกิน! ${winnerName} พลิกนรกกลับมาทวงทุกบาททุกสตางค์!`,
    );
  }

  if (minScore <= -100) {
    comments.push(
      `จะเครซี่! ${loserName} รับน้ำหนักไม่ไหว ถล่มไป ${minScore} กู้แอปมาจ่ายเถอะ!`,
      `สภาพพพ! ${loserName} โดนสับเละ ${minScore} กลับไปขุดดินคราฟต์ของเล่นคนเดียวไป!`,
      `ยับกว่าทิชชู่เปียก! ${loserName} ขิตไป ${minScore} เปิดแอปโอนจ่ายมาซะดีๆ!`,
      `ตู้ ATM เคลื่อนที่! ${loserName} โดนช็อตฟีลไป ${minScore}`,
      `ทำถึงมาก! ${loserName} รับจบวงนี้ แจกทานไป ${minScore} สาธุชนชื่นชม!`,
      `นอยอ่า! ${loserName} แตกยับ ${minScore} กู้ภัยยังไม่กล้าเข้าช่วย!`,
    );
  } else if (minScore < 0) {
    comments.push(
      `สู้ชีวิตแต่เพื่อนสู้กลับ! ${loserName} ร่วงไป ${minScore}`,
      `ทรงอย่างแบด! ${loserName} เลือดซิบไป ${minScore} ถือว่าทำบุญให้เพื่อน`,
      `ตัวจ่ายประจำแก๊ง! ${loserName} รูดบัตรไปเบาๆ ${minScore} เพื่อนรักทุกคน!`,
      `นั่งงงในดงเซียน! ${loserName} โดนไป ${minScore} ทำหน้าเหมือนโดนของ!`,
      `ช็อตฟีลสุดๆ ${loserName} ติดลบไป ${minScore} ร้องไห้ได้นะ ไม่บอกใคร`,
    );
  }

  if (comments.length === 0) return "";

  return comments[Math.floor(Math.random() * comments.length)];
}
