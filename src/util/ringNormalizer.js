function normalizeRingNameHoldToCaution(ring) {
  const normalized = (ring || '').trim().toLowerCase()
  if (normalized === 'hold' || normalized === 'caution') {
    return 'Caution'
  }
  return ring
}

module.exports = { normalizeRingNameHoldToCaution }
