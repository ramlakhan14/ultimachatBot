import React, { HTMLAttributes } from 'react';
import { Image } from '@chakra-ui/react';
import projectCubeIcon from "../Icons/ProjectCubeIcon.svg"
interface IconProps extends HTMLAttributes<SVGElement> {
	width?: string;
	height?: string;
}
export const ProjectInfocard = ({
	width = "56px",
	height = "56px",
	...restProps
}: IconProps) => {
	return (
		<Image src={projectCubeIcon} alt="projectCubeIcon" width={width} height={height} />
	);
};
