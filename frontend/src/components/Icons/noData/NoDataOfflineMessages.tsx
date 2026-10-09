import React, { HTMLAttributes } from 'react';
interface IconProps extends HTMLAttributes<SVGElement> {
  width?: string;
  height?: string;
}
export const NoDataOfflineMessages = ({
  width = "100",
  height = "100",
  ...restProps
}: IconProps) => {
  return (
    <img src='/icons/Offline-data.svg' alt='oflline data' />
  )
};
