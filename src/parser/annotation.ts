export interface CocosAnnotation {
  rawName: string;
  displayName: string;
  type?:
    | 'Node'
    | 'Sprite'
    | 'Label'
    | 'Button'
    | 'Prefab'
    | 'ProgressBar'
    | 'Toggle'
    | 'ScrollView';
  prefab?: string;
  textureDir?: string;
  asset?: string;
  export?: 'png' | 'jpg' | 'svg';
  ignore?: boolean;
  flatten?: boolean;
  textKey?: string;
  font?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'center' | 'bottom';
  overflow?: 'none' | 'clamp' | 'shrink' | 'resize-height';
  slice?: [number, number, number, number];
  anchor?: [number, number];
  bundle?: string;
  component?: string;
  warnings: string[];
}

const TYPE_ALIASES = new Set([
  'Node',
  'Sprite',
  'Label',
  'Button',
  'Prefab',
  'ProgressBar',
  'Toggle',
  'ScrollView'
]);

function parseNumberTuple(value: string, count: number): number[] | undefined {
  const nums = value.split(',').map((v) => Number(v.trim()));
  if (nums.length !== count || nums.some((n) => Number.isNaN(n))) return undefined;
  return nums;
}

export function parseAnnotation(rawName: string): CocosAnnotation {
  const warnings: string[] = [];
  const match = rawName.match(/^(.*?)\s*\[cc:(.+)]\s*$/i);
  const displayName = (match?.[1] ?? rawName).trim();
  const body = match?.[2]?.trim();

  const annotation: CocosAnnotation = {
    rawName,
    displayName,
    warnings
  };

  if (!body) return annotation;

  for (const entry of body.split(';').map((v) => v.trim()).filter(Boolean)) {
    if (!entry.includes('=')) {
      if (entry === 'ignore') {
        annotation.ignore = true;
        continue;
      }
      if (entry === 'flatten') {
        annotation.flatten = true;
        continue;
      }
      if (TYPE_ALIASES.has(entry)) {
        annotation.type = entry as CocosAnnotation['type'];
        continue;
      }
      warnings.push(`Unknown flag: ${entry}`);
      continue;
    }

    const [key, ...rest] = entry.split('=');
    const value = rest.join('=').trim();
    const k = key.trim();

    switch (k) {
      case 'type':
        if (TYPE_ALIASES.has(value)) annotation.type = value as CocosAnnotation['type'];
        else warnings.push(`Invalid type value: ${value}`);
        break;
      case 'prefab':
        annotation.prefab = value;
        break;
      case 'textureDir':
        annotation.textureDir = value;
        break;
      case 'asset':
        annotation.asset = value;
        break;
      case 'export':
        if (value === 'png' || value === 'jpg' || value === 'svg') annotation.export = value;
        else warnings.push(`Invalid export value: ${value}`);
        break;
      case 'textKey':
        annotation.textKey = value;
        break;
      case 'font':
        annotation.font = value;
        break;
      case 'align':
        if (value === 'left' || value === 'center' || value === 'right') annotation.align = value;
        else warnings.push(`Invalid align value: ${value}`);
        break;
      case 'valign':
        if (value === 'top' || value === 'center' || value === 'bottom') annotation.valign = value;
        else warnings.push(`Invalid valign value: ${value}`);
        break;
      case 'overflow':
        if (value === 'none' || value === 'clamp' || value === 'shrink' || value === 'resize-height') {
          annotation.overflow = value;
        } else {
          warnings.push(`Invalid overflow value: ${value}`);
        }
        break;
      case 'slice': {
        const nums = parseNumberTuple(value, 4);
        if (!nums) warnings.push(`Invalid slice value: ${value}`);
        else annotation.slice = nums as [number, number, number, number];
        break;
      }
      case 'anchor': {
        const nums = parseNumberTuple(value, 2);
        if (!nums) warnings.push(`Invalid anchor value: ${value}`);
        else annotation.anchor = nums as [number, number];
        break;
      }
      case 'bundle':
        annotation.bundle = value;
        break;
      case 'component':
        annotation.component = value;
        break;
      case 'ignore':
        annotation.ignore = value === 'true' || value === '1';
        break;
      case 'flatten':
        annotation.flatten = value === 'true' || value === '1';
        break;
      default:
        warnings.push(`Unknown key: ${k}`);
    }
  }

  return annotation;
}
