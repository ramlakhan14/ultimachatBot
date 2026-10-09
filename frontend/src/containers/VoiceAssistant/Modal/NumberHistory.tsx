import {
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Box,
  Image,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Spinner,
  ModalHeader,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import Outgoing from "../Images/outgoing.svg";
import Incoming from "../Images/incoming.svg";
import { campaignRecording } from "../../../services/VoiceBot";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import TableComponent from "../../TableComponent";


export const NumberHistory = ({ isOpen, onClose, historyData }: { isOpen: boolean; onClose: () => void, historyData: any }) => {

  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>([]);

  const NoCampaign = () => {
    onClose();
  }
  const closeCancelCampaign = () => {
    onClose();
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response: any = await campaignRecording(historyData?.phoneNumber);
        setUserData(response.data.data);
      } catch (error: any) {

      } finally {
        setIsLoading(false);
      }
    };
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);


  const tableHeader = [
    'Call Type',
    'Duration',
    'Voice Records',
    'Date'
  ]
  const tableDataKeys = []

  return (
    <>
      <Modal
        isCentered
        onClose={onClose}
        isOpen={isOpen}
        size="3xl"
        closeOnOverlayClick={false} scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign={"center"} pt={"24px"}>Phone Number:{historyData?.phoneNumber}</ModalHeader>
          <ModalBody>
            {/* <Box
              textAlign="center"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px"></Text>
            </Box> */}
            <Box>
              <TableComponent
                isLoading={isLoading}
                data={userData || []}
                // tableDataKeys={tableDataKeys}
                tableHeader={tableHeader}
                customRowRenderer={(data: any, index: number) => {
                  return (
                    <Tr key={index}>
                      <Td>{index + 1}</Td>
                      <Td><div style={{ display: "flex", alignItems: "center" }}>
                        {data.callType === "Outgoing" || data.callType === "outgoing" ? <img src={Outgoing} alt='outgoing' width={"16px"} height={"16px"} style={{ display: "inline" }} /> : <img src={Incoming} alt='incoming' width={"16px"} height={"16px"} style={{ display: "inline" }} />}
                        <span style={{ marginLeft: "4px" }}>{data.callType}</span>
                      </div></Td>
                      <Td>{data?.callDuration}</Td>
                      {/* <Td>{data?.recordingUrl}</Td> */}
                      <Td>{data?.recordingUrl === "N/A" ? "N/A" : <a style={{ textDecoration: "underline" }} href={data?.recordingUrl} target='_blank'>Listen Recording</a>}</Td>
                      <Td>{format(new Date(data?.createdAt), 'dd/MM/yyyy, hh:mm a')}</Td>
                    </Tr>
                  );
                }}
              />
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={NoCampaign} sx={{
              _focus: {
                boxShadow: 'none',  // Removes the focus box shadow
              }
            }}
            >
              <Text as="span" ms="4px" fontSize="16px" fontWeight="400">Close</Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
