import React from 'react'
import { OfflineMessagePagination, OfflineMessage } from '../../types/knowledgebase.type'
import { Flex, VStack, Box, Heading, Text, TableContainer, Table, Thead, Tr, Th, Tbody } from '@chakra-ui/react';
import { OfflineMessagesList } from '../../components/OfflineMessages/OfflineMessagesList';
import { NoDataOfflineMessages } from '../../components/Icons/noData/NoDataOfflineMessages';
import { OfflineMessageWindow } from '../../components/OfflineMessages/OfflineMessageWindow';

type OfflineMessagesProps = {
    isChatListLoading: boolean;
    chatSessionsPage: OfflineMessagePagination;
    onPageChange: (page: number) => void;
    knowledgeBaseId: string;
    pageNumber: number;
}

export const OfflineMessagesNew = ({ isChatListLoading, chatSessionsPage, onPageChange, knowledgeBaseId, pageNumber }: OfflineMessagesProps) => {
    const [selectedChat, setSelectedChat] = React.useState<OfflineMessage>(chatSessionsPage.results[0]);

    React.useEffect(() => {
        setSelectedChat(chatSessionsPage.results[0]);
    }, [chatSessionsPage])

    const handleSelectChat = React.useCallback((chatSession: OfflineMessage) => {
        setSelectedChat(chatSession);
    }, []);

    if (!chatSessionsPage.results.length) {
        return (
            <VStack
                alignItems="center"
                direction="column"
                justifyContent="center"
                w="100%"
                h="100%"
                pt="10px"
                pb="10px"
                spacing={9}
            >
                <NoDataOfflineMessages />
                <Box textAlign="center">
                    <Heading
                        maxW="580px"
                        fontSize="18px"
                        fontWeight="600"
                        as="h3"
                        mb={4}
                        color="gray.500"
                        lineHeight="medium"
                        textAlign="center"
                    >
                        Offline messages by your customers will appear here.
                    </Heading>
                </Box>
            </VStack>
        )
    }

    return (
        <Flex w="100%">
            <OfflineMessagesList
                isChatListLoading={isChatListLoading}
                chatSessionsPage={chatSessionsPage}
                selectedChat={selectedChat}
                onSelectChat={handleSelectChat}
                onPageChange={onPageChange}
                knowledgeBaseId={knowledgeBaseId}
                pageNumber={pageNumber}
            />
            {/* <OfflineMessageWindow offlineChatData={selectedChat} /> */}
        </Flex>
    )
}