const asId = value => typeof value === 'string' && value.trim()
  ? value.trim()
  : typeof value === 'number' && Number.isFinite(value) ? String(value) : null;

function fingerprint(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}

// RPC projections can use material_id/note_id instead of id. Keep domain IDs,
// remove repeated rows, and give older read-only entries stable React identities.
export function normalizeStudyList(rows, { prefix = 'study', idFields = ['id', 'material_id', 'note_id'] } = {}) {
  if (rows == null) return [];
  if (!Array.isArray(rows)) throw new Error('Could not read your study materials. Please refresh and try again.');
  const seen = new Set();
  const keys = new Map();
  return rows.reduce((result, row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return result;
    const id = idFields.map(field => asId(row[field])).find(Boolean);
    const identity = id || JSON.stringify([
      row.class_subject_id, row.upload_id, row.title, row.subject, row.grade,
      row.content, row.summary, row.created_at, row.key_concepts, row.examples,
    ]);
    if (seen.has(identity)) return result;
    seen.add(identity);
    const base = `${prefix}:${id || fingerprint(identity)}`;
    const occurrence = keys.get(base) || 0;
    keys.set(base, occurrence + 1);
    result.push({ ...row, ...(id ? { id } : {}), listKey: occurrence ? `${base}:${occurrence}` : base });
    return result;
  }, []);
}
