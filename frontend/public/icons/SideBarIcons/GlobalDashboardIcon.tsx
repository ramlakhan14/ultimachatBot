import React, { HTMLAttributes } from 'react';
interface IconProps extends HTMLAttributes<SVGElement> {
  width?: number;
  height?: number;
  fill?: string;
}
export const GlobalDashboardIcon = ({
  width = 20,
  height = 20,
  fill = "#1A202C"
}: IconProps) => {
  return (
    <svg width="22" height="22" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3.39392H4C3.44772 3.39392 3 3.84164 3 4.39392V11.3939C3 11.9462 3.44772 12.3939 4 12.3939H9C9.55228 12.3939 10 11.9462 10 11.3939V4.39392C10 3.84164 9.55228 3.39392 9 3.39392Z" stroke={fill} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M20 3.39392H15C14.4477 3.39392 14 3.84164 14 4.39392V7.39392C14 7.94621 14.4477 8.39392 15 8.39392H20C20.5523 8.39392 21 7.94621 21 7.39392V4.39392C21 3.84164 20.5523 3.39392 20 3.39392Z" stroke={fill} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M20 12.3939H15C14.4477 12.3939 14 12.8416 14 13.3939V20.3939C14 20.9462 14.4477 21.3939 15 21.3939H20C20.5523 21.3939 21 20.9462 21 20.3939V13.3939C21 12.8416 20.5523 12.3939 20 12.3939Z" stroke={fill} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M9 16.3939H4C3.44772 16.3939 3 16.8416 3 17.3939V20.3939C3 20.9462 3.44772 21.3939 4 21.3939H9C9.55228 21.3939 10 20.9462 10 20.3939V17.3939C10 16.8416 9.55228 16.3939 9 16.3939Z" stroke={fill} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
    </svg>

  );
};


