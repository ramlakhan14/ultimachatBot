import React from "react";
import { format } from 'date-fns';
import {
  Button,
  Text,
  Modal,
  ModalOverlay,
  Spinner,
  ModalContent,
  ModalBody,
  ModalHeader,
  ModalCloseButton,
  FormControl,
  Image,
  Flex,
  FormErrorMessage,
  Box,
  ModalFooter
} from "@chakra-ui/react";
import { chatSummaryForEmail, chatSummaryForMessages } from '../../services/knowledgebaseService';
import { el } from "date-fns/locale";

const SummaryModal = ({ isOpen, title, onClose }: any) => {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [summary, setSummary] = React.useState<string>("");

  const fatchData = async () => {
    try {
      setIsLoading(true);
      const payload = { "messages": isOpen?.chatMessage };
      const emailConversation = { "emails": isOpen?.emailConversation?.emailConversation };
      if (isOpen?.IsLeadType == "mailBot" || isOpen?.IsLeadType === 'emailAssistant' || isOpen?.IsLeadType === 'emailOutreach') {
        const response: any = await chatSummaryForEmail(emailConversation);
        setSummary(response?.data?.data?.summary);


      } else {

        const response: any = await chatSummaryForMessages(payload);
        setSummary(response?.data?.data);

      }
      // console.log(payload);
    } catch (error) {
      // console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (isOpen?._id && isOpen.type == "chatbot") {
      fatchData();
    }
  }, [isOpen?._id]);

  return (
    <Modal isOpen={Boolean(isOpen?._id)} size="xl" onClose={onClose} scrollBehavior="inside" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent padding="0px 20px">
        <ModalHeader textAlign="center" mt="20px" textTransform={"capitalize"}>
          {
            title ? title : isOpen?.type === "voicebot" ? "Recording" : `${(isOpen?.IsLeadType === "mailBot" || isOpen?.IsLeadType === 'emailAssistant' || isOpen?.IsLeadType === 'emailOutreach') ? (isOpen?.IsLeadType?.replace(/([a-z])([A-Z])/g, '$1 $2') || "Email") : "Chatbot"} Summary`
          }
        </ModalHeader>
        <ModalBody>

          <Box bg="#F7FAFC" borderRadius="8px">
              {
                isOpen.type?.toLowerCase() == "voicebot" && isOpen?.voiceBotRecordingURL ?
                  <Box>
                    <audio
                      controls
                      style={{ width: "100%" }}
                      src={isOpen?.voiceBotRecordingURL || ""}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </Box>
                  : title ? (
                    <Text>
                      {isOpen?.callSummery || "N/A"}
                    </Text>
                  ) : isOpen.type?.toLowerCase() == "chatbot" ? (
                    <>
                      {
                        isOpen.type?.toLowerCase() == "chatbot" &&
                        <>
                          {isLoading ? (
                            <Text display={"flex"} alignItems={"center"} justifyContent={"center"}>
                              <Spinner />
                            </Text>
                          ) : (
                            <Text color="#212529">
                              {summary || "Email Summary is not available"}
                            </Text>
                          )}
                        </>
                      }
                    </>
                  ) : (
                    <Text>
                      Your browser does not support the audio element. / Recording not found.
                    </Text>
                  )
              }

          </Box>
        </ModalBody>
        <ModalFooter padding="20px 0px">
          <Button color="#fff" bg={"#2977FF"} _hover={{ background: "#2977FF" }} mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default SummaryModal;