import { Image } from '@chakra-ui/react';
import React, { HTMLAttributes } from 'react';
interface IconProps extends HTMLAttributes<SVGElement> {
	width?: number;
	height?: number;
}
export const Logo = ({ height = 28, width, ...restProps }: IconProps) => {
	return (
		<Image src={"/icons/logoblu.svg"} alt="logo" height="40px" width="143px" />
	);
};
