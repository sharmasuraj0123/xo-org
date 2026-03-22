export function XOLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      width={size}
      height={size}
      className={className}
    >
      <polyline
        stroke="#fff"
        strokeWidth="15.38"
        fill="none"
        strokeMiterlimit="10"
        points="36.99 165.84 118.47 247.31 31.16 334.61"
      />
      <polyline
        stroke="#83d63a"
        strokeWidth="15.38"
        fill="none"
        strokeMiterlimit="10"
        points="328.12 165.06 246.65 246.53 333.95 333.84"
      />
      <polyline
        stroke="#83d63a"
        strokeWidth="15.38"
        fill="none"
        strokeMiterlimit="10"
        points="380.51 165.06 461.99 246.53 374.68 333.84"
      />
      <polyline
        stroke="#fff"
        strokeWidth="15.38"
        fill="none"
        strokeMiterlimit="10"
        points="244.91 165.84 163.44 247.31 250.74 334.61"
      />
    </svg>
  );
}
