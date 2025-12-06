export type ImageFilterType =
  | 'None'
  | 'BlackWhite'
  | 'Brownie'
  | 'Vintage'
  | 'Kodachrome'
  | 'Technicolor'
  | 'Polaroid'
  | 'Invert'
  | 'Sepia'
  | 'Convolute'
  | 'BlendColor'
  | 'Mask'

export const ImageFilters: ImageFilterType[] = [
  'None',
  'BlackWhite',
  'Brownie',
  'Vintage',
  'Kodachrome',
  'Technicolor',
  'Polaroid',
  'Invert',
  'Sepia'
]

export const ImageFiltersWithParams: ImageFilterType[] = ['Convolute', 'BlendColor', 'Mask']
