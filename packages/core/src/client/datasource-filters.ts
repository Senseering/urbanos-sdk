import type { DatasourceListOptions, DatasourceView } from './transport.js';

export function validateDatasourceFilters(opts?: DatasourceListOptions): void {
  if (opts?.sensorType && Array.from(opts.sensorType).length > 256) {
    throw new RangeError('sensorType must be at most 256 characters');
  }
  if (
    opts?.tagIds &&
    (opts.tagIds.length > 50 || opts.tagIds.some((id) => !Number.isSafeInteger(id) || id <= 0))
  ) {
    throw new RangeError('tagIds must contain at most 50 positive safe integers');
  }
}

export function matchesDatasourceFilters(
  ds: DatasourceView,
  opts?: DatasourceListOptions,
): boolean {
  return (
    (!opts?.category || ds.category === opts.category) &&
    (!opts?.sensorType || ds.sensor_type === opts.sensorType) &&
    (!opts?.tagIds?.length || opts.tagIds.every((id) => ds.tags?.some((tag) => tag.id === id)))
  );
}
