import React from 'react';
import { IoIosCalendar, IoMdTime } from 'react-icons/io';
import ImgChat from "../../../../components/Icons/email-assistant/imgBot.png";

import { Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody, Box, Flex, Heading, Text } from '@chakra-ui/react';
const EmailChatModal = ({ isOpen, onClose, chatData, date, time, receiverEmail }: any) => {

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false} size='lg'>
      <ModalOverlay />
      <ModalContent maxW={"900px"}>
        <ModalCloseButton />
        <ModalBody>
          <Box mx="auto" mt={10}>
            <Flex direction="column" align="" mb={6}>
              <Flex gap={2}><Text as="span" fontWeight={600} fontSize="18px">User Email: </Text><Text as="span">{receiverEmail}</Text></Flex>
              <Box minHeight={'700px'} padding={'20px'} position="relative">
                <Flex justifyContent="space-between" alignItems="center" gap={3} mb={5}>
                  {date !== null && <Text fontSize="12px" color="#6C757D" display="flex" alignItems="center" gap={2}><IoIosCalendar color="#6C757D" />
                    {/* 2024-07-10, Wednesday */}
                    {date}
                  </Text>}
                  {time !== null && <Text fontSize="12px" color="#6C757D" display="flex" alignItems="center" gap={2}><IoMdTime color="#6C757D" />
                    {/* 11:53 am */}
                    {time}
                  </Text>}
                </Flex>
                <Box maxHeight={'700px'} overflowY={'auto'}>
                  {chatData && chatData.map((chat: any, index: number) => (
                    <React.Fragment key={index}>
                      {chat?.isReceivedEmail && (
                        <Box className="autoRepliesChat">
                          <div className="botAlign">
                            <div style={{ width: "fit-content" }}>
                              <div className="chat-message-container">
                                <div className="chat-message-avatar">
                                  <img src={ImgChat} alt="chat-image" style={{ border: "1px solid #ccc", borderRadius: "50px" }} />
                                </div>
                                <div className="chat-message-content" >
                                  <div className="chat-message-header">
                                    <span className="chat-message-sender" style={{ textTransform: "capitalize" }}>
                                      User
                                    </span>
                                  </div>

                                  <div
                                    style={{ background: "#e3f3ff" }}
                                    className="message-chat"
                                    dangerouslySetInnerHTML={{
                                      __html: (chat?.emailTextContent)
                                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold text inside ** **
                                        .replace(/(\s|^)([1-9]|1[0-9]|20)\./g, '<b><br>$&</b>') // Line break before list items
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Box>
                      )}

                      {chat?.isSentEmail && (
                        <Box className="autoRepliesChat">
                          <div className="userAlign">
                            <div style={{ width: "fit-content", gap: "10px" }} className="chat-message">
                              <div
                                className="chat-message-text"
                                style={{
                                  backgroundColor: "#e3f3ff",
                                  marginLeft: "50px",
                                  marginBottom: "20px",
                                  width: "fit-content", // Make the width fit the message content
                                }}
                              >
                                <div
                                  style={{ textAlign: "left" }}
                                  className="message-chat"
                                  dangerouslySetInnerHTML={{
                                    __html: (chat?.emailTextContent)
                                      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold text inside ** **
                                      .replace(/(\s|^)([1-9]|1[0-9]|20)\./g, '<b><br>$&</b>') // Line break before list items
                                  }}
                                />
                              </div>
                              <img src={ImgChat} alt="Logo" className="chat-message" style={{ border: "1px solid #ccc", borderRadius: "50px", marginBottom: "20px" }} />
                            </div>
                          </div>
                        </Box>
                      )}
                    </React.Fragment>
                  ))}
                  {!chatData && <Text color="#212529" textAlign={'center'}>No email selected to view the generated leads chat content.</Text>}
                </Box>
              </Box>
            </Flex>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default EmailChatModal;