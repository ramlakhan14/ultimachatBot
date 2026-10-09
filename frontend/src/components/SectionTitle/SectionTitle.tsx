import * as React from 'react';
import {
	Flex,
	Heading,
	Text,
} from '@chakra-ui/react';

export interface SectionTitleProps {
	title: string,
	description: string
}

export const SectionTitle = ({
	title,
	description
}: SectionTitleProps) => {

	return <Flex w="100%" mb="6">
		<Flex maxW="620px" direction="column">

			<Heading as="h2" fontSize="20px" mb="1" fontWeight="600" color="gray.800" isTruncated>
				{title}
			</Heading>
			<Text color="#6C757D">
				{description}
			</Text>
		</Flex>
	</Flex>
};
