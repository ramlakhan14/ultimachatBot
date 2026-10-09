import * as React from "react";
import {
  createChatBotSession,
  getChatBotAnswer,
  quickReplies,
} from "../../services/knowledgebaseService";

import { uuidv4 } from "../../utils/commonUtils";
import { ChatBotCustomizeData } from "../../types/knowledgebase.type";
import { Box, Button, Textarea, useToast } from "@chakra-ui/react";
import { FiSend } from "react-icons/fi";
// import imgBot from "./logobox.png";
import imgUser from "./b6814fe0059864b7a6d980314752c173.png";
export interface ChatBotProps {
  customStyle: ChatBotCustomizeData;
  knowledgeBaseId: string;
  showCloseButton?: boolean;
  defaultMessageNumber: number;

}

const maxMessages = 20;

const getMessageClassName = (type: string) => {
  if (type === "bot") {
    return "chat-message chatbot";
  } else if (type === "bot-error") {
    return "chat-message chatbot-error";
  } else {
    return "chat-message user";
  }
};
const getMessageStyle = (type: string, customStyle: any) => {
  if (type === "bot") {
    return {};
  } else if (type === "bot-error") {
    return { backgroundColor: "rgb(255 205 205)", color: "#000" };
  } else {
    return {
      backgroundColor: customStyle.backgroundColor,
      color: customStyle.fontColor,
    };
  }
};



export const ChatBot = ({
  customStyle,
  knowledgeBaseId,
  defaultMessageNumber = 0,

}: any) => {
  // const user = CurrentUser.get();
  const toast = useToast();

  const [sessionId, setSessionId] = React.useState<string>("");
  const [numberOfMessagesLeft, setNumberOfMessagesLeft] =
    React.useState<number>(maxMessages - defaultMessageNumber);

  const [buttonDisplay, setButtonDisplay] = React.useState(true);
  const [containerHeight, setContainerHeight] = React.useState('100%');
  const [messages, setMessages] = React.useState<any[]>([
    {
      type: "bot",
      id: uuidv4(),
      message:
        customStyle?.welcomeMessage || "Hello! How can I assist you today?",
    },
  ]);

  const [question, setQuestion] = React.useState<any>("");



  const chatRef = React.useRef<HTMLDivElement>(null);
  const [buttonText, setButtonText] = React.useState(`1. "What is ${customStyle.split('.')[0]}"
  2. "Contact Us"`)

  // Parse the data
  // const parseData = (data: string) => {
  //   const lines = data.split('\n');
  //   return lines.map(line => {
  //     const match = line.match(/"\s*(.*?)\s*"/);
  //     return match ? match[1] : '';
  //   });
  // };


  const parseData = (data: string) => {
    // const lines = data.split('\n');
    // return lines.map(line => {
    //   const match = line.match(/"\s*(.?)\s"/);
    //   return match ? match[1] : line.trim();
    // });
    // const lines = data.split('\n');
    const lines = data.includes('\n') ? data.split('\n') : data.split(',');
    return lines.map(line => {
      const match = line.match(/"(.*)"/); // Updated regex to capture text inside quotes
      return match ? match[1].trim() : line.trim();
    });
  };
  const [buttonTexts, setButtonTexts] = React.useState(parseData(buttonText));

  React.useEffect(() => {
    if (chatRef.current) {
      const height: any = chatRef.current.scrollHeight;
      setContainerHeight(height);
      chatRef.current.scrollTop = height;
    }
  }, [messages]); // The effect runs when 'data' changes


  const handleChatChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setQuestion(e.target.value);
    },
    []
  );

  const [triggerHandleSubmit, setTriggerHandleSubmit] = React.useState(false);
  const [submitEvent, setSubmitEvent] = React.useState<any>(null);

  const quickData = React.useCallback(async (quickMessage: any, event: any) => {
    const value = event.currentTarget.dataset.value;

    if (value) {
      setQuestion(value);
      setButtonDisplay(prevDisplay => prevDisplay);

      // Store the event and trigger useEffect
      setSubmitEvent(event);
      setTriggerHandleSubmit(true);

    } else {
      // console.error("Value from dataset is undefined");
    }


  }, [buttonDisplay, quickReplies, parseData, setButtonDisplay, setButtonTexts, setQuestion]);





  const handleSubmit = React.useCallback(
    async (e: any) => {
      if (!buttonDisplay) return;
      setQuestion("");
      const newMessages = [
        ...messages,
        { type: "user", message: question, id: uuidv4() },
        { type: "bot", isLoading: true, id: uuidv4() },
      ];
      setMessages(newMessages);
      let newSessionId: any = sessionId;
      setButtonDisplay(false);
      if (!sessionId) {
        try {
          const res: any = await createChatBotSession(knowledgeBaseId);
          newSessionId = res.data;
          setSessionId(res.data);
        } catch (error: any) {

          toast({
            title: `${error?.response?.data?.message}` || error.message,
            status: "error",
            isClosable: true,
          });
        } finally {

        }
      }
      try {

        const response: any = await getChatBotAnswer(newSessionId, question);

        setNumberOfMessagesLeft(numberOfMessagesLeft - 1);
        const messagesToUpdate = newMessages.filter(
          (message) => !message.isLoading
        );

        if (response.data?.response) {
          setMessages([
            ...messagesToUpdate,
            { type: "bot", message: response.data?.response, id: uuidv4() },
          ]);
          const res: any = await quickReplies(response.data?.response, newSessionId);
          setButtonTexts(parseData(res.data.response))
        } else if (
          typeof response.data === "string" &&
          response.data.trim() === "Sorry I cannot respond right now"
        ) {
          setMessages([
            ...messagesToUpdate,
            {
              type: "bot-error",
              message:
                "You have exceeded token limit. Please upgrade to a higher plan.",
              id: uuidv4(),
            },
          ]);
        }
      } catch (error) {

        const messagesToUpdate = newMessages.filter(
          (message) => !message.isLoading
        );
        setMessages([
          ...messagesToUpdate,
          {
            type: "bot",
            message: `Oops! Unfortunately, I'm unable to answer right now.`,
            id: uuidv4(),
          },
        ]);
      } finally {
        setButtonDisplay(true); // Re-enable the button
      }
    },
    [knowledgeBaseId, messages, numberOfMessagesLeft, question, sessionId]
  );

  React.useEffect(() => {
    const submitData = () => {
      if (triggerHandleSubmit && submitEvent) {
        handleSubmit(submitEvent);
        setTriggerHandleSubmit(false); // Reset trigger
      }
    };

    submitData();
  }, [triggerHandleSubmit, submitEvent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      if (target.value) {
        handleSubmit(e);
      }
    }
  };

  return (
    <div
      className="chat-wrap widget-open"
      id="chat-wrap"
      style={{ margin: "0%" }}
    >
      <div
        className="chat-widget-app"
        style={{ width: "100%", height: "calc(100vh - 180px)" }}
      >

        <div
          id="chat-messages"
          className="chat-messages"

          ref={chatRef}
          style={{ height: containerHeight, overflowY: 'auto', padding: "0px" }}
        >
          {messages.map((message, index) => {
            const style = getMessageStyle(message.type, customStyle);
            const className = getMessageClassName(message.type);
            if (message.isLoading) {
              return (
                <div className={className} key={message.id}>
                  <div
                    className="chat-message-text"
                    style={{ marginTop: "10px", marginBottom: "10px" }}
                  >
                    <div className="chat-loading-dot-cont">
                      <div
                        className="chat-loading-dot"
                        style={{ backgroundColor: customStyle.backgroundColor }}
                      ></div>
                      <div
                        className="chat-loading-dot"
                        style={{ backgroundColor: customStyle.backgroundColor }}
                      ></div>
                      <div
                        className="chat-loading-dot"
                        style={{ backgroundColor: customStyle.backgroundColor }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            }

            else if (message.type === "bot") {
              return (
                <div className="botAlign">
                  <div className={className} key={message.id} style={{ width: "fit-content" }}>
                    <div className="chat-message-container">
                      <div className="chat-message-avatar">
                        <img src={"/icons//logobox.png"} alt="CV Infotech Logo" />
                      </div>
                      <div className="chat-message-content">
                        <div className="chat-message-header">
                          <span className="chat-message-sender" style={{ textTransform: "capitalize" }}>

                            {typeof customStyle === "string"
                              ? `${customStyle.split('.')[0]} Assistant`
                              : null}

                          </span>
                        </div>

                        <div
                          className="message-chat"
                          dangerouslySetInnerHTML={{
                            __html: message.message
                              .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold the text inside ** **
                              .replace(/(\s|^)([1-9]|1[0-9]|20)\./g, '<b><br>$&</b>')  // Line break before list items
                          }}
                        />

                      </div>
                    </div>
                  </div>
                </div>
              );
            } else if (message.type === "user") {
              return (
                <div className="userAlign">
                  <div className={className} key={message.id} style={{ width: "fit-content" }}>
                    <div
                      className="chat-message-text"
                      style={{
                        backgroundColor: "rgb(227, 243, 255)",
                        marginLeft: "50px",
                        marginBottom: "20px",
                        width: "fit-content", // Make the width fit the message content

                      }}
                    >
                      <div style={{ textAlign: "left" }} className="message-chat">{message.message}</div>
                    </div>
                    <img src={imgUser} alt="Logo" className="chat-message-logo" />{" "}
                  </div>
                </div>
              );
            }
          })}
        </div>
        <Box className="">
          <Box sx={{ display: 'flex', gap: 2, padding: 2, float: "right", marginRight: "35px" }}>
            <Button
              variant="outlined"
              sx={{
                fontSize: "14px",
                fontWeight: '400',
                padding: '4px 8px',
                border: '1px dashed #CED4DA',
                borderRadius: '4px',
                backgroundColor: 'white',
                textTransform: 'none',
              }}
              data-value={buttonTexts[0]}
              onClick={(event) => quickData(messages, event)}
              style={{ visibility: buttonDisplay && buttonTexts[0] !== "" ? 'visible' : 'hidden' }}
            >
              {buttonTexts[0] || ''}

            </Button>
            <Button
              variant="outlined"
              sx={{
                fontSize: "14px",
                fontWeight: '400',
                padding: '4px 8px',
                border: '1px dashed #CED4DA',
                borderRadius: '4px',
                backgroundColor: 'white',
                textTransform: 'none',
              }}
              style={{ visibility: buttonDisplay && buttonTexts[0] !== "" ? 'visible' : 'hidden' }}

              data-value={buttonTexts[1]}
              onClick={(event) => quickData(messages, event)}
            >
              {buttonTexts[1] || ''}
            </Button>
          </Box>
          <Textarea
            value={question}
            onChange={handleChatChange}
            placeholder="Yes, an e-commerce website for selling swimming gears."
            size="lg"
            variant="filled"
            border="1px solid black" // Add black border
            width="100%" // Set width to 100%
            bg="white"
            borderColor="#CED4DA"
            onKeyDown={handleKeyDown}
            id="chat-input"
            fontSize="16px"
            colorScheme="#212529"
            fontWeight="400"
            className="chatBotTextarea"
            overflow="hidden"

          />
        </Box>
        <Box
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginTop: "10px",
          }}
        >
          <p style={{
            color: "#212529", fontSize: "14px"
          }} >
            Powered by <span style={{ color: "#2977FF" }}>Ultima</span>
            <span style={{
              color: "#2977FF"
            }}>bot</span>
          </p>
          <Button
            colorScheme="blue"
            className="btn-hover-pri"
            onClick={handleSubmit}
            isDisabled={!buttonDisplay}
          >
            <span style={{ marginRight: "10px" }}>
              <FiSend />
            </span>
            Send
          </Button>
        </Box>
      </div>
    </div>
  );

};
