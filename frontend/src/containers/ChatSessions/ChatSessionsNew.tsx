import { Box, Flex, Heading, Input, InputGroup, InputLeftElement, Spinner, Text, VStack } from '@chakra-ui/react'
import React, { useEffect, useCallback, useMemo, useRef } from 'react'
import { ChatList } from '../../components/ChatSessions/ChatList'
import { ChatWindow } from '../../components/ChatSessions/ChatWindow'
import { NoDataChatSessions } from '../../components/Icons/noData/NoDataChatSessions'
import { useConfirmation } from '../../providers/providers'
import { chatSessionSearch, deleteChatSession, getChatSessionDetails, getChatSessions, readChatSession, unReadChatSession } from '../../services/knowledgebaseService'
import { ChatSession, ChatSessionDetail, ChatSessionPagination } from '../../types/knowledgebase.type'
import styles from "./ChatSessions.module.scss"
import { IoIosSearch } from 'react-icons/io'
import { useLocation } from 'react-router-dom'

export type ChatSessionsProps = {
    chatbotId: string;
    chatBotName: string;
    chatbotType: string;
}

export const ChatSessionsNew = ({ chatbotId, chatBotName, chatbotType }: ChatSessionsProps) => {
    const [chatSessions, setChatSessions] = React.useState<ChatSessionPagination>();
    const [isChatLoading, setIsChatLoading] = React.useState<boolean>(true);
    const [isChatLoadingInner, setIsChatLoadingInner] = React.useState<boolean>(true);
    const { showConfirmation } = useConfirmation()
    const [selectedChats, setSelectedChats] = React.useState<ChatSession>();
    const [chatData, setChatData] = React.useState<ChatSessionDetail>();
    const [searchValue, setSearchValue] = React.useState('');
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const [forcePage, setForcePage] = React.useState<number>(0);
    const handleInputChange = (event: any) => {
        setSearchValue(event.target.value); // Update state with the input value
    };
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const tab = queryParams.get('tab');
    const chatSessionId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get("chatSessionId");
    }, [location.search]);



    const requestIdRef = useRef(0);

    const selectFirstValidChat = (results: any[] = []) => {
        if (!results.length) return;

        const selected =
            results.find(chat => chat.firstMessage) || results[0];

        handleSelectChat(selected);
    };

    const fetchSessions = useCallback(
        async ({ search = "", sessionId = "" } = {}) => {
            const requestId = ++requestIdRef.current;
            try {
                const response = search
                    ? await chatSessionSearch(chatbotId, 1, search)
                    : await getChatSessions(chatbotId, 1, sessionId);

                // ignore outdated response
                if (requestId !== requestIdRef.current) return;

                // console.log("response", response);

                const data = response.data;
                setChatSessions(data);
                selectFirstValidChat(data.results);
                setIsChatLoadingInner(false);
            } catch (error) {
                setIsChatLoadingInner(false);
                // console.error("Error fetching chat sessions:", error);
            }
        },
        [chatbotId]
    );

    useEffect(() => {
        if (!chatbotId) return;
        fetchSessions({ sessionId: chatSessionId ?? "" });
    }, [chatbotId, chatSessionId, fetchSessions]);

    useEffect(() => {
        if (!chatbotId) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            fetchSessions({ search: searchValue, sessionId: chatSessionId ?? "" });
            setForcePage(0);
            timeoutRef.current = null;
        }, 500);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [chatbotId, searchValue, fetchSessions]);


    const handlePageClick =
        // React.useCallback
        async (selectedPage: number) => {
            try {
                setIsChatLoading(true);
                if (searchValue.length === 0) {
                    const response = await getChatSessions(chatbotId, selectedPage + 1, chatSessionId ?? "");
                    setIsChatLoadingInner(false);
                    setIsChatLoading(false);
                    setChatSessions(response.data);
                    handleSelectChat(response.data.results.find((chatSession) => chatSession.firstMessage) || response.data.results[0])
                    // setSelectedChat(response.data.results.find((chatSession) => chatSession.firstMessage) || response.data.results[0])
                }
                else {
                    const response = await chatSessionSearch(chatbotId, selectedPage + 1, searchValue);
                    setIsChatLoadingInner(false);
                    setIsChatLoading(false);
                    setChatSessions(response.data);
                    handleSelectChat(response.data.results.find((chatSession: any) => chatSession.firstMessage) || response.data.results[0])
                    // setSelectedChat(response.data.results.find((chatSession: any) => chatSession.firstMessage) || response.data.results[0])
                }
            } catch (error) {

            } finally {
                setIsChatLoading(false);
                setIsChatLoadingInner(false);
            }

        }
    // );

    const updateChatSessionReadStatus = useCallback(async (chatId: string, isUnread: boolean) => {
        try {
            // Toggle read/unread based on isUnread flag
            await (isUnread ? unReadChatSession : readChatSession)(chatId);
            if (chatSessions) {
                const updatedResults = chatSessions.results.map(item =>
                    item._id === chatId ? { ...item, isUnread } : item
                );
                setChatSessions((prev) => {
                    if (!prev) return undefined;
                    return { ...prev, results: updatedResults };
                });
            }
        } catch (error) {

        }
    }, [chatSessions, setChatSessions]);


    React.useEffect(() => {
        let ignore = false;
        async function fetchData() {
            if (!selectedChats) {
                if (selectedChats == "undefined") {
                    setIsChatLoading(false);
                    setIsChatLoadingInner(false);
                }
                return
            };
            setIsChatLoading(true);
            try {
                const response = await getChatSessionDetails(selectedChats._id);
                setIsChatLoading(false);
                setIsChatLoadingInner(false);

                if (selectedChats.isUnread) {
                    updateChatSessionReadStatus(selectedChats._id, false)
                }
                // if (!ignore) return;
                setChatData(response.data);
            } catch (error) {
                // console.log("run 2");
            } finally {
                // console.log("run 3");
                setIsChatLoading(false);
                setIsChatLoadingInner(false);
            }
        }
        // console.log("run chatSessions", chatSessions, tab);
        // if (tab === "chat-sessions") {
        fetchData();
        // }
        return () => { ignore = true };
    }, [selectedChats?._id, tab]);

    const onDeleteChat = useCallback(async (chatId: string) => {
        try {
            await deleteChatSession(chatId);
            if (chatSessions) {
                const updatedResults = chatSessions.results.filter(item => item._id !== chatId);
                if (updatedResults.length === 0) {
                    handlePageClick(0)
                } else {
                    setChatSessions({ ...chatSessions, results: updatedResults });
                }
            }
        } catch (error) {

        }
    }, [chatSessions, setChatSessions])


    const handleSelectChat = React.useCallback((chatSession: ChatSession) => {
        setSelectedChats(chatSession);
    }, []);


    if (isChatLoadingInner && chatSessionId) {
        return (
            <Flex h="100%" alignItems="center" justifyContent="center">
                <Spinner
                    thickness="2px"
                    speed="0.65s"
                    emptyColor="gray.200"
                    color="gray.700"
                    size="xl"
                />
            </Flex>
        );
    }
    if ((!chatSessions || !selectedChats)) {
        // if (!chatSessions || !selectedChat) {
        return (<>
            <Box display="flex" alignItems={'center'} justifyContent="space-between">
                <Box>
                    <Text
                        fontSize="20px"
                        fontWeight="600"
                        mb="4px" // margin-bottom for spacing
                        color="#1A202C"
                    >
                        Chat sessions
                    </Text>
                    <Text fontSize="16px" color="#6C757D" fontWeight="400" mb="24px">
                        All the chat sessions with your customers.
                    </Text>
                </Box>
                <Box>
                    <Text as="span" marginRight="8px">
                        <InputGroup
                            width="400px"
                            borderRadius="4px"
                        // borderColor="#6C757D"
                        >
                            <InputLeftElement pointerEvents='none'>
                                <IoIosSearch color="#6C757D" />
                            </InputLeftElement>

                            <Input type='text' placeholder='Search' color="#6C757D"
                                value={searchValue}
                                onChange={handleInputChange}
                            />
                        </InputGroup>
                    </Text>
                </Box>
            </Box>
            <Text as="p" p={'8px 12px'} bg={'#efefef'} textAlign={'center'} fontSize={'14px'} color={'#6C757D'}>No Chat Session found</Text>
        </>);
    }
    return (
        <><Box display="flex" alignItems={'center'} justifyContent="space-between">
            <Box>
                <Text
                    fontSize="20px"
                    fontWeight="600"
                    mb="4px" // margin-bottom for spacing
                    color="#1A202C"
                >
                    Chat sessions
                </Text>
                <Text fontSize="16px" color="#6C757D" fontWeight="400" mb="24px">
                    All the chat sessions with your customers.
                </Text>
            </Box>
            <Box>
                <Text as="span" marginRight="8px">
                    <InputGroup
                        width="400px"
                        borderRadius="4px"
                    // borderColor="#6C757D"
                    >
                        <InputLeftElement pointerEvents='none'>
                            <IoIosSearch color="#6C757D" />
                        </InputLeftElement>

                        <Input type='text' placeholder='Search' color="#6C757D"
                            value={searchValue}
                            onChange={handleInputChange}
                        />
                    </InputGroup>
                </Text>
            </Box>
        </Box>
            {!chatSessions?.results.length ? (
                <VStack
                    alignItems="center"
                    direction="column"
                    justifyContent="center"
                    w="100%"
                    h="100%"
                    pt={32}
                    pb={32}
                    spacing={9}
                >
                    <NoDataChatSessions />
                    <Box textAlign="center">
                        <Heading
                            maxW="580px"
                            fontSize="xl"
                            fontWeight="500"
                            as="h3"
                            mb={4}
                            color="gray.500"
                            lineHeight="medium"
                            textAlign="center"
                        >
                            Chat history with your customers will appear here.
                        </Heading>
                    </Box>
                </VStack>
            ) : (
                <Flex w="100%" className={styles.trainingDataCont}>
                    <Flex w="100%">
                        <ChatList
                            isChatListLoading={isChatLoading}
                            chatSessionsPage={chatSessions}
                            selectedChat={selectedChats}
                            // selectedChat={selectedChat}
                            chatbotType={chatbotType}
                            onSelectChat={handleSelectChat}
                            onPageChange={handlePageClick}
                            forcePage={forcePage}
                            updateChatSessionReadStatus={updateChatSessionReadStatus}
                            onDeleteChat={(chatId) => {
                                showConfirmation(true, {
                                    title: 'Delete Chat',
                                    content: 'Are you sure you want to delete this chat?',
                                    confirmButtonText: 'Delete',
                                    onClose: () => showConfirmation(false),
                                    onConfirm: () => {
                                        onDeleteChat(chatId);
                                        showConfirmation(false)
                                    },
                                })
                            }}
                        />
                        <ChatWindow
                            chatData={chatData}
                            userData={chatData?.userData}
                            messages={chatData?.messages}
                            isMessagesLoading={isChatLoading}
                            chatBotName={chatBotName}
                        />
                    </Flex>
                </Flex>
            )}
        </>
    );

}