import { medicalSources } from './medicalSources.mjs'

export function retrieveMedicalSources(query, limit = 3) {
  const normalized = normalize(query)
  if (!normalized) return []
  const queryTokens = new Set(tokenize(normalized))

  return medicalSources
    .map((source) => ({ source, score: scoreSource(source, normalized, queryTokens) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ source }) => source)
}

export function sourceCitations(sources) {
  return sources.map(({ id, title, organization, url, updatedAt }) => ({ id, title, organization, url, updatedAt }))
}

function scoreSource(source, normalizedQuery, queryTokens) {
  let score = 0
  for (const keyword of source.keywords) {
    const normalizedKeyword = normalize(keyword)
    if (normalizedQuery.includes(normalizedKeyword)) score += normalizedKeyword.length >= 3 ? 5 : 3
    if (queryTokens.has(normalizedKeyword)) score += 2
  }
  for (const token of tokenize(`${source.title} ${source.summary}`)) {
    if (queryTokens.has(token)) score += 1
  }
  return score
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '').replace(/[^0-9a-z가-힣]/g, '')
}

function tokenize(value) {
  return String(value ?? '').toLowerCase().match(/[0-9a-z가-힣]{2,}/g) ?? []
}
