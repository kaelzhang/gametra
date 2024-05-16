const TYPES = {
  ONE_HOUR: 1,
  SIX_HOUR: 2,
  TWELVE_HOUR: 3,
  SIXTEEN_HOUR: 4,
  ONE_DAY: 5,
}

const HARVEST_REDUCE_FACTOR = 0.25

// Day to second
const d = (day, hour = 0, minute = 0, second = 0) =>
  day * 24 * 60 * 60 + hour * 60 * 60 + minute * 60 + second

const h = (hour, minute = 0, second = 0) =>
  hour * 60 * 60 + minute * 60 + second

const m = (minute, second = 0) =>
  minute * 60 + second

class CropPreset {
  constructor (
    harvest_time,
    dry_up_after,
    min_irrigation_interval
  ) {
    this.harvest_time = harvest_time
    this.dry_up_after = dry_up_after
    this.min_irrigation_interval = min_irrigation_interval
  }

  get reduce_each_time () {
    return this.dry_up_after * HARVEST_REDUCE_FACTOR
  }
}

const PRESETS = {
  [TYPES.ONE_HOUR]: new CropPreset(
    h(1),
    m(20),
    m(2)
  ),
  [TYPES.SIX_HOUR]: new CropPreset(
    h(6),
    h(2),
    m(12)
  ),
  [TYPES.TWELVE_HOUR]: new CropPreset(
    h(12),
    h(4),
    m(24)
  ),
  [TYPES.SIXTEEN_HOUR]: new CropPreset(
    h(16),
    h(5, 20),
    m(32)
  ),
  [TYPES.ONE_DAY]: new CropPreset(
    d(1, 8),
    h(10, 40),
    h(1, 40)
  ),
}

class Crop {
  constructor (
    type,
    left_to_harvest = undefined,
    dry_up_after = undefined,
    record_time = Date.now()
  ) {
    this.preset = PRESETS[type]
    this.left_to_harvest = left_to_harvest || (
      this.preset.harvest_time - this.preset.reduce_each_time
    )
    this.dry_up_after = dry_up_after || this.preset.dry_up_after
    this.record_time = record_time
  }

  get earlest_harvest_time () {
    const harvest_after = this._harvest_after

    return new Date(this.record_time + harvest_after * 1000)
  }

  get _harvest_after () {
    const after_last_irrigation = this.preset.dry_up_after - this.dry_up_after

    const harvest_after = (
      this.left_to_harvest - after_last_irrigation * HARVEST_REDUCE_FACTOR
    ) / (1 + HARVEST_REDUCE_FACTOR)

    if (
      after_last_irrigation + harvest_after < this.preset.min_irrigation_interval
    ) {
      return this.left_to_harvest
    }

    return harvest_after < 0
      ? 0
      : harvest_after
  }
}

const crop = new Crop(
  TYPES.ONE_DAY,
  h(17, 6),
  h(10, 30),
  // new Date('2024-05-15 0:56:25').getTime()
)

console.log(crop.earlest_harvest_time.toString())
