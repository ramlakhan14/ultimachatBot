import { Box, Button, Flex, Image, Popover, PopoverArrow, PopoverCloseButton, PopoverContent, PopoverTrigger, Spinner, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tooltip, Tr } from "@chakra-ui/react";
import React from "react";
import { GoInfo } from "react-icons/go";
import styles from "./ContactNumber.module.scss";
import addIcon from "../Images/add.svg";
import DeleteIcon from "../Images/delete.svg";
import AddNewNumberModal from "../Modal/AddNewNumberModal";
import { fetchAllPhoneNumber } from "../../../services/VoiceBot";
import { DeleteModal } from "../Modal/DeleteModal";
import { colors } from "../../../utils/constant";


const GetNumberFromAuth = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAllNumber, setIsAllNumber] = React.useState([]);
  const [settingsdetailsId, setSettingsdetailsId] = React.useState<string | null>(null);
  const [isOpenDeleteModal, setIsOpenDeleteModal] = React.useState(false);
  const [isDeletedId, setDeleteId] = React.useState<any>(null);
  const onClose = () => {
    setIsOpen(false);
  };


  const fetchData = async () => {
    try {
      const userData = await fetchAllPhoneNumber();
      setIsAllNumber(userData.data.data)

    } catch (error) {
      // console.error('Failed to fetch users:', error);
    }
  };

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const serverId = searchParams.get("serverId");
    setSettingsdetailsId(serverId);
  }, []); // This runs once on component mount to set the state.


  React.useEffect(() => {
    if (settingsdetailsId) {
      fetchData(); // Call your fetchData function when settingsdetailsId is set.
    }
  }, [settingsdetailsId]);

  const onDeleteModal = () => {
    setIsOpenDeleteModal(false);
  }


  return (<>
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
    >
      <Box mt="0px">
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Text as="p" fontSize="30px" color="#1A202C" fontWeight="600">Numbers Details</Text>
          </Box>
          <Box ml="auto">
            <Button colorScheme="blue"
              onClick={() => {
                setIsOpen(true)
              }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 6C12 6.13261 11.9473 6.25979 11.8536 6.35355C11.7598 6.44732 11.6326 6.5 11.5 6.5H6.5V11.5C6.5 11.6326 6.44732 11.7598 6.35355 11.8536C6.25979 11.9473 6.13261 12 6 12C5.86739 12 5.74021 11.9473 5.64645 11.8536C5.55268 11.7598 5.5 11.6326 5.5 11.5V6.5H0.5C0.367392 6.5 0.240215 6.44732 0.146447 6.35355C0.0526785 6.25979 0 6.13261 0 6C0 5.86739 0.0526785 5.74021 0.146447 5.64645C0.240215 5.55268 0.367392 5.5 0.5 5.5H5.5V0.5C5.5 0.367392 5.55268 0.240215 5.64645 0.146447C5.74021 0.0526785 5.86739 0 6 0C6.13261 0 6.25979 0.0526785 6.35355 0.146447C6.44732 0.240215 6.5 0.367392 6.5 0.5V5.5H11.5C11.6326 5.5 11.7598 5.55268 11.8536 5.64645C11.9473 5.74021 12 5.86739 12 6Z" fill="white" />
              </svg>

              <Text as="span" ms="8px">Add New
              </Text>
            </Button>
          </Box>
        </Flex>
      </Box>
      <Box mt="24px" minW="100%" w="600px">
        <Box>
          <TableContainer
            maxH={"calc(100vh - 245px)"} // height for vertical scroll
            mt={'24px'}
            w="100%"
            boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
            bg={'#fff'}
            border="1px solid #E2E8F0"
            borderRadius="8px"
            sx={{
              overflow: "scroll!important",
              "::-webkit-scrollbar": {
                display: "none"
              }
            }}
          >
            <Table variant="simple">
              <Thead sx={{
                position: 'sticky',
                top: -1,
                zIndex: 1,
                fontSize: '14px',
                fontWeight: '600'
              }} bg={colors.tableHeadingBg}  >
                <Tr>
                  <Th w="50px">#</Th>
                  <Th w="300px">Admin's Phone No</Th>
                  <Th w="250px" >Status</Th>
                  <Th w="300px">Assign Assistant</Th>
                  <Th w="300px">Working Status</Th>
                  <Th w="250px" textAlign={"end"}>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {isSubmitting ? <Tr><Td colSpan={6} textAlign="center"><Spinner /></Td></Tr> :
                  isAllNumber?.length > 0 ? (
                    isAllNumber?.map((number: any, index: number) => (
                      <Tr key={index}>
                        <Td>{index + 1}</Td>
                        <Td>{number.phoneNumber}</Td>
                        <Td>
                          {number?.callType === "inbound" || number?.callType === "Inbound" ? (
                            <Text as="span" display={'flex'} alignItems={'center'} width={'max-content'} gap={1} className={styles.inbound}>
                              <svg width="7" height="7" viewBox="0 0 7 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0.500041 6.41667C0.381985 6.41667 0.283027 6.37674 0.203166 6.29688C0.123305 6.21701 0.083374 6.11806 0.083374 6V2.66667C0.083374 2.54861 0.123305 2.44965 0.203166 2.36979C0.283027 2.28993 0.381985 2.25 0.500041 2.25C0.618096 2.25 0.717055 2.28993 0.796916 2.36979C0.876777 2.44965 0.916707 2.54861 0.916707 2.66667V5L5.45837 0.458333C5.53476 0.381944 5.63199 0.34375 5.75004 0.34375C5.8681 0.34375 5.96532 0.381944 6.04171 0.458333C6.1181 0.534722 6.15629 0.631944 6.15629 0.75C6.15629 0.868056 6.1181 0.965278 6.04171 1.04167L1.50004 5.58333H3.83337C3.95143 5.58333 4.05039 5.62326 4.13025 5.70312C4.21011 5.78299 4.25004 5.88194 4.25004 6C4.25004 6.11806 4.21011 6.21701 4.13025 6.29688C4.05039 6.37674 3.95143 6.41667 3.83337 6.41667H0.500041Z" fill="#198754" />
                              </svg>
                              Inbound Call
                            </Text>
                          ) : number?.callType === "outbound" || number?.callType === "Outbound" ? (
                            <Text as="span" display={'flex'} alignItems={'center'} gap={1} width={'max-content'} className={styles.outbound}>
                              <svg width="7" height="7" viewBox="0 0 7 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.08333 1.99992L1.54167 6.54159C1.46528 6.61797 1.36806 6.65617 1.25 6.65617C1.13194 6.65617 1.03472 6.61797 0.958333 6.54159C0.881944 6.4652 0.84375 6.36797 0.84375 6.24992C0.84375 6.13186 0.881944 6.03464 0.958333 5.95825L5.5 1.41659H3.16667C3.04861 1.41659 2.94965 1.37665 2.86979 1.29679C2.78993 1.21693 2.75 1.11797 2.75 0.999919C2.75 0.881863 2.78993 0.782905 2.86979 0.703044C2.94965 0.623183 3.04861 0.583252 3.16667 0.583252H6.5C6.61806 0.583252 6.71701 0.623183 6.79688 0.703044C6.87674 0.782905 6.91667 0.881863 6.91667 0.999919V4.33325C6.91667 4.45131 6.87674 4.55027 6.79688 4.63013C6.71701 4.70999 6.61806 4.74992 6.5 4.74992C6.38194 4.74992 6.28299 4.70999 6.20312 4.63013C6.12326 4.55027 6.08333 4.45131 6.08333 4.33325V1.99992Z" fill="#991B1B" />
                              </svg>
                              Outbound Call
                            </Text>
                          ) : null}
                        </Td>
                        <Td>{number.assistantName}</Td>
                        <Td>{number.status === "No" || number.status === "no" ? <Text as="span" className={styles.useIn}>Not In Use</Text> : <Text as="span" className={styles.useIn}>Use</Text>}</Td>
                        <Td textAlign={"end"}>
                          <Tooltip fontSize={"11px"} label="Delete">

                            <Button size="sm" colorScheme="red" onClick={() => { setIsOpenDeleteModal(true); setDeleteId(number._id) }}><Image src={"/icons/delete.svg"} alt="deleteicon" /></Button>
                          </Tooltip>
                        </Td>

                      </Tr>

                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={6} textAlign="center">
                        <Text color="gray.500">No data found</Text>
                      </Td>
                    </Tr>
                  )
                }

              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Box >
    <DeleteModal isOpenDeleteModal={isOpenDeleteModal} onDeleteModal={onDeleteModal} fetchData={fetchData} isDeletedId={isDeletedId} />
    <AddNewNumberModal isOpen={isOpen} onClose={onClose} fetchData={fetchData} />
  </>);
}

export default GetNumberFromAuth;