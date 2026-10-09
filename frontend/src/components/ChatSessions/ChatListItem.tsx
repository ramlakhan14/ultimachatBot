import { Button, Flex, useToast, Text, Box } from '@chakra-ui/react'
import { formatDistanceStrict } from 'date-fns'
import React from 'react'
import { ChatSession } from '../../types/knowledgebase.type'
import { DeleteIcon } from '../Icons/DeleteIcon'
import { ReadIcon } from '../Icons/ReadIcon'
import { UnreadIcon } from '../Icons/UnreadIcon'
import style from "./ChatWindow.module.scss"
import { CurrentUser } from '../../services/appConfig'

type ChatListItemProps = {
    isSelected?: boolean;
    chatSessionData: ChatSession;
    chatbotType: string,
    onSelectChat: (chatSession: ChatSession) => void;
    updateChatSessionReadStatus: (chatId: string, isUnread: boolean) => void
    onDeleteChat: (chatId: string) => void
}

export const ChatListItem = ({ chatSessionData, isSelected, onSelectChat, updateChatSessionReadStatus, onDeleteChat }: ChatListItemProps) => {
    const getFormattedTime = React.useCallback((date: string) => {
        return formatDistanceStrict(new Date(date), new Date(), { addSuffix: true });
    }, []);

    return (
        <Flex
            // direction="column"
            position="relative"
            cursor="pointer"
            p={'6px 8px'}
            w="100%"
            alignItems="center"
            borderTop={isSelected ? "1px solid E2E8F0" : "0px"}
            bg={isSelected ? '' : chatSessionData.isUnread ? '#e3f3ff' : 'white'}
            borderRight={"2px"}
            borderWidth={isSelected ? "medium" : "1px"}
            borderRightColor={isSelected ? "#2977ff" : "transparent"}
            onClick={() => onSelectChat(chatSessionData)}
        >
            <Box w="100%">
                <Text fontSize="12px" color="#6C757D"
                    // fontWeight={chatSessionData.isUnread ? '600' : '400'}
                    fontWeight={'400'}
                >
                    {getFormattedTime(chatSessionData.updatedAt)}
                </Text>

                <Flex justifyContent="space-between" alignItems="center">
                    <Text fontSize="14px" noOfLines={2}
                        // fontWeight={chatSessionData.isUnread ? '500' : '400'} color="#1A202C" mr={2}
                        fontWeight={'400'}>
                        {chatSessionData.firstMessage.q}
                    </Text>


                </Flex>
            </Box>
            <Flex>
                <Button
                    size="sm"
                    fontSize={12}
                    padding="0"
                    height="20px"
                    variant="outline"
                    onClick={(e) => {

                        e.stopPropagation();
                        updateChatSessionReadStatus(chatSessionData._id, !chatSessionData.isUnread)

                    }}
                    mr={2} // Add some space between the buttons
                    className={style.readBtn}
                >
                    {chatSessionData.isUnread ? <UnreadIcon /> : <ReadIcon />}
                </Button>
                <Button
                    size="sm"
                    fontSize={12}
                    padding="0"
                    height="20px"
                    variant="outline"
                    colorScheme="red"
                    onClick={(e) => {
                        const userRole = CurrentUser.get();
                        // if (userRole.role === "admin" && chatbotType !== "vakmangids") {
                        //     toast({
                        //         title: `You cannot change the specific settings of the admin's project.`,
                        //         status: "error",
                        //         isClosable: true,
                        //     });

                        // } else {
                        e.stopPropagation();
                        onDeleteChat(chatSessionData._id)
                        // }
                    }}
                    className={style.readBtn}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clip-path="url(#clip0_10100_16477)">
                            <path d="M8.99976 0C9.26497 1.16811e-06 9.51925 0.105433 9.70679 0.292969C9.89432 0.480505 9.99976 0.734786 9.99976 1H13.4998C13.765 1 14.0193 1.10543 14.2068 1.29297C14.3943 1.4805 14.4998 1.73479 14.4998 2V3C14.4998 3.26521 14.3943 3.5195 14.2068 3.70703C14.0193 3.89457 13.765 4 13.4998 4H12.9998V13C12.9998 13.5304 12.7889 14.039 12.4138 14.4141C12.0387 14.7891 11.5302 15 10.9998 15H4.99976C4.46933 15 3.96077 14.7891 3.58569 14.4141C3.21062 14.039 2.99976 13.5304 2.99976 13V4H2.49976C2.23454 4 1.98026 3.89456 1.79272 3.70703C1.60519 3.5195 1.49976 3.26521 1.49976 3V2C1.49976 1.73478 1.60519 1.48051 1.79272 1.29297C1.98026 1.10543 2.23454 1 2.49976 1H5.99976C5.99976 0.734784 6.10519 0.480505 6.29272 0.292969C6.48026 0.105432 6.73454 0 6.99976 0H8.99976ZM3.99976 4.05859V13C3.99976 13.2652 4.10519 13.5195 4.29272 13.707C4.48026 13.8946 4.73454 14 4.99976 14H10.9998C11.265 14 11.5193 13.8946 11.7068 13.707C11.8943 13.5195 11.9998 13.2652 11.9998 13V4.05859L11.8816 4H4.11792L3.99976 4.05859ZM5.49976 5.5C5.63236 5.5 5.7595 5.55272 5.85327 5.64648C5.94704 5.74025 5.99976 5.86739 5.99976 6V12C5.99975 12.1326 5.94704 12.2597 5.85327 12.3535C5.7595 12.4473 5.63236 12.5 5.49976 12.5C5.36715 12.5 5.24001 12.4473 5.14624 12.3535C5.05247 12.2597 4.99976 12.1326 4.99976 12V6C4.99976 5.86739 5.05247 5.74025 5.14624 5.64648C5.24001 5.55272 5.36715 5.5 5.49976 5.5ZM7.99976 5.5C8.13236 5.5 8.2595 5.55272 8.35327 5.64648C8.44704 5.74025 8.49976 5.86739 8.49976 6V12C8.49975 12.1326 8.44704 12.2597 8.35327 12.3535C8.2595 12.4473 8.13236 12.5 7.99976 12.5C7.86715 12.5 7.74001 12.4473 7.64624 12.3535C7.55247 12.2597 7.49976 12.1326 7.49976 12V6C7.49976 5.86739 7.55247 5.74025 7.64624 5.64648C7.74001 5.55272 7.86715 5.5 7.99976 5.5ZM10.4998 5.5C10.6324 5.5 10.7595 5.55272 10.8533 5.64648C10.947 5.74025 10.9998 5.86739 10.9998 6V12C10.9998 12.1326 10.947 12.2597 10.8533 12.3535C10.7595 12.4473 10.6324 12.5 10.4998 12.5C10.3671 12.5 10.24 12.4473 10.1462 12.3535C10.0525 12.2597 9.99976 12.1326 9.99976 12V6C9.99976 5.86739 10.0525 5.74025 10.1462 5.64648C10.24 5.55272 10.3671 5.5 10.4998 5.5ZM2.49976 2V3H13.4998V2H2.49976Z" fill="#DC3545" />
                        </g>
                        <defs>
                            <clipPath id="clip0_10100_16477">
                                <rect width="16" height="16" fill="white" />
                            </clipPath>
                        </defs>
                    </svg>
                </Button>
            </Flex>
        </Flex>


    )
}