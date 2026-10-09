import React, { ReactNode } from 'react'
import { Box, Flex, Heading, VStack } from '@chakra-ui/react';
interface PageLayoutProps {
  breadCrums?: ReactNode;
  pageHeaderContent?: ReactNode;
  pageTitle?: string;
  children: ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  breadCrums,
  pageHeaderContent,
  pageTitle,
  children,

}) => {
  return (
    <Box
      w="100%"
      maxW="100%"
      p="6"
      pb={"0px"}
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
      overflowX="hidden"
    >
      {breadCrums && breadCrums}
      <VStack w="100%" spacing="10">
        <Flex shrink={0} w="100%" justifyContent="space-between">
          <Flex width="100%" alignItems={"center"} py={0} my={0} justifyContent="space-between" gap="5px">
            <Box>
              <Heading fontSize="24px" color="#1A202C">{pageTitle || ""}</Heading>
            </Box>
            {pageHeaderContent && pageHeaderContent || ""}
          </Flex>
        </Flex>
      </VStack>

      {children}
    </Box>
  )
}

export default PageLayout
