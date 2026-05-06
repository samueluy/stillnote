import Svg, { Path } from 'react-native-svg';

import { palette } from '@/src/components/primitives';

export function BibleGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M4.5 5.5C4.5 4.948 4.948 4.5 5.5 4.5H11.25C12.124 4.5 12.964 4.847 13.582 5.465L14 5.883L14.418 5.465C15.036 4.847 15.876 4.5 16.75 4.5H18.5C19.052 4.5 19.5 4.948 19.5 5.5V18.75C19.5 19.302 19.052 19.75 18.5 19.75H16.75C15.876 19.75 15.036 20.097 14.418 20.715L14 21.133L13.582 20.715C12.964 20.097 12.124 19.75 11.25 19.75H5.5C4.948 19.75 4.5 19.302 4.5 18.75V5.5Z"
        stroke={palette.text}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.4}
      />
      <Path
        d="M14 6.25V19.75M7.5 8.25H10.5M7.5 11.25H10.5"
        stroke={palette.text}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
      />
    </Svg>
  );
}
