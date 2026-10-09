import React from 'react'
import { Box } from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'
import ChakraUIRenderer from 'chakra-ui-markdown-renderer'
import { markdownTheme } from '../../theme/markdownTheme'
import imgBot from "./4f560e3b79d267007880b0e4dba6ba05.png";
import imgUser from "./b6814fe0059864b7a6d980314752c173.png";
type ChatBubbleProps = {
  message: string;
  type: 'user' | 'bot';
}

export const ChatBubbles = ({ message, type }: ChatBubbleProps) => {
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
        type === 'bot' ? message :
          <div className="userAlign">
            <div style={{ width: "fit-content" }}>
              <div
                className="chat-message-text"
                style={{
                  backgroundColor: "rgb(227, 243, 255)",
                  marginLeft: "50px",
                  marginBottom: "20px",
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