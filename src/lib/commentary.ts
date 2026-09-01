// Round commentary generator ("roast the loser"), ported from the legacy
// prototype's generateRoundCommentary (reference/legacy-prototype.sanitized.html
// L816-884). Pure function: no DOM, no Firebase - saveRound calls this once
// per confirmed round and stores the result on the history entry. Every line
// has its emoji stripped per the no-emoji rule; render an icon (e.g. lucide
// Flame) at the call site instead.
import type { HistoryEntry, Player } from "@/types/models";

const ROAST_CHANCE = 0.3;

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
      `เจ้าหนี้หน้าสั่น! ${winnerName} พลิกนรกกลับมาทวงทุกบาททุกสตางค์!`,
      `เมื่อกี้แกล้งตายใช่มั้ย? ${winnerName} ลุกมาฟาดเรียบ!`,
      `ตัวตึงคืนชีพ! ${winnerName} โดนไปรอบก่อน รอบนี้กลับมาแบกวงเฉย!`,
      `ฟีลตัวพ่อตัวแม่! ${winnerName} ลบตราบาปรอบก่อน คืนฟอร์มโหดจัด!`,
    );
  }

  if (minScore <= -100) {
    comments.push(
      `โครงสร้างพังยับ! ${loserName} รับน้ำหนักไม่ไหว ถล่มไป ${minScore}!`,
      `สภาพพพ! ${loserName} โดนสับเละ ${minScore} กลับไปขุดดินคราฟต์ของเล่นคนเดียวไป!`,
      `เป็นเจ้าภาพงานศพตัวเองหรอ? ${loserName} แจกทานไป ${minScore} สาธุชนชื่นชม!`,
      `ยับกว่าทิชชู่เปียก! ${loserName} ขิตไป ${minScore} เปิดแอปโอนจ่ายมาซะดีๆ!`,
      `ตู้ ATM เคลื่อนที่! ${loserName} โดนช็อตฟีลไป ${minScore}`,
      `ฟีลเสี่ยสายเปย์! ${loserName} โดนดูดไป ${minScore} เพื่อนๆ ไหว้ขอบคุณรอบวง!`,
      `นอนกอดเข่าร้องไห้ไปเลย! ${loserName} แตกยับ ${minScore} กู้ภัยยังไม่กล้าเข้าช่วย!`,
    );
  } else if (minScore < 0) {
    comments.push(
      `ฐานรากไม่แน่นก็งี้แหละ! ${loserName} ร่วงไป ${minScore}`,
      `แค่หยอกๆ ใช่มั้ย? ${loserName} เลือดซิบไป ${minScore} ถือว่าทำบุญให้เพื่อน`,
      `จ่ายมาซะดีๆ ${loserName} โดนไป ${minScore} อย่าเนียนชิ่ง!`,
      `ฝีมือหรือดวงซวย? ${loserName} ติดลบไป ${minScore} ร้องไห้ได้นะ ไม่บอกใคร`,
      `ดวงกุดจัดๆ ${loserName} โดนสะกิดไป ${minScore} ฟีลคนดวงตกแห่งปี!`,
      `ตัวจ่ายประจำแก๊ง! ${loserName} รูดบัตรไปเบาๆ ${minScore} เพื่อนรักทุกคน!`,
      `นั่งงงในดงเซียน! ${loserName} โดนไป ${minScore} ทำหน้าเหมือนโดนของ!`,
    );
  }

  if (comments.length === 0) return "";

  return comments[Math.floor(Math.random() * comments.length)];
}
