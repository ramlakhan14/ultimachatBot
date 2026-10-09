import React from 'react'
// import imgBot from "./logobox.png";
import imgUser from "./b6814fe0059864b7a6d980314752c173.png";
type ChatBubbleProps = {
    message: string;
    type: 'user' | 'bot';
    chatBotName: string;
}

export const ChatBubble = ({ message, type, chatBotName }: ChatBubbleProps) => {
    return (
        <>
            {/* <Box
                borderRadius="lg"
                p={3}
                minH="42px"
                mb={3}
                fontSize="sm"
                bg={type === 'user' ? 'gray.200' : 'blue.100'}
            >
                {
                    type === 'user' ? message :
                        <ReactMarkdown
                            components={ChakraUIRenderer(markdownTheme)}
                            children={message}
                            skipHtml
                        />
                }
            </Box> */}
            {
                type === 'user' ? null :
                    <div className="botAlign">
                        <div style={{ width: "fit-content" }}>
                            <div className="chat-message-container">
                                <div className="chat-message-avatar">
                                    <img src={"/icons//logobox.png"} alt="CV Infotech Logo" />
                                </div>
                                <div className="chat-message-content">
                                    <div className="chat-message-header">
                                        <span className="chat-message-sender" style={{ textTransform: "capitalize" }}>

                                            {typeof chatBotName === "string"
                                                ? `${chatBotName.split('.')[0]} Assistant`
                                                : null}
                                        </span>
                                    </div>

                                    <div
                                        className="message-chat"
                                        dangerouslySetInnerHTML={{
                                            __html: message
                                                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold the text inside ** **
                                                .replace(/(\s|^)([1-9]|1[0-9]|20)\./g, '<b><br>$&</b>')  // Line break before list items
                                        }}
                                    />

                                </div>
                            </div>
                        </div>
                    </div>
            }
            {
                type === 'bot' ? null :
                    <div className="userAlign">
                        <div style={{ width: "fit-content" }} className="chat-message">
                            <div
                                className="chat-message-text"
                                style={{
                                    backgroundColor: "#EAF1FF",
                                    marginLeft: "50px",
                                    marginBottom: "16px",
                                    width: "fit-content", // Make the width fit the message content

                                }}
                            >
                                <div style={{ textAlign: "left" }} className="message-chat">{message}</div>
                            </div>
                            <img src={imgUser} alt="Logo" className="chat-message-logo" />{" "}
                        </div>
                    </div>
            }

        </>
    )
}