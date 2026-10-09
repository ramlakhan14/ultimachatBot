import * as React from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Text,
  VStack,
  Table,
  Thead,
  Tr,
  Td,
  Tbody,
  Th,
  Select,
  TableContainer,
  useDisclosure,
  InputGroup,
  InputLeftElement,
  Input,
  Checkbox,
  useToast,
  Image,
  useColorModeValue,
  IconButton,
  Progress,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Spinner,
} from "@chakra-ui/react";
import styles from "./InviteUsers.module.scss";
import { EmailPlusIcon } from "../../components/Icons/Icon";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { IoIosSearch } from "react-icons/io";
import { Link } from "react-router-dom";
import { GmbSearch } from "./Modal/GmbSearch";
import { getInviteUser, ScrapLeadsReinvite, ScrapUserProfile } from "../../services/inviteUserServices";
import SignedUpTrue from "./SignedUpTrue.svg"
import SignedUpFailed from "./SignedUpFailed.svg"
import SignedUpProcessing from "./SignedUpProcessing.svg"
import SignedUpResend from "./SignedUpResend.svg"
import { format } from "date-fns";
import { formatNumber } from "../../utils/commonUtils";
import { Paginator } from "../../widgets/Paginator/Paginator";
import TableComponent from "../TableComponent";


export const InviteUsers = () => {
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchValue, setSearchValue] = React.useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(searchValue);
  const [currentPageBeforeSearch, setCurrentPageBeforeSearch] = React.useState(0);
  const [inviteUsersData, setInviteUsersData] = React.useState<any>();
  const [isSearchActive, setIsSearchActive] = React.useState<boolean>(false);
  const [isDisplay, setIsDisplay] = React.useState<boolean>(false);
  const [userId, setUserId] = React.useState<number>(0);
  const [userProfile, setUserProfile] = React.useState<any>();
  const [isOpens, setIsOpens] = React.useState<boolean>(false);
  const [userProfileS, setUserProfiles] = React.useState<any>();
  const [isEditing, setIsEditing] = React.useState(false);
  const [forcePage, setForcePage] = React.useState<number>(0);
  // const [reInviting, setReinviting] = React.useState(false);
  const [reinvitingId, setReinvitingId] = React.useState<number | null>(null);
  const [isfetching, setisfetching] = React.useState<boolean>(true);

  const toast = useToast();

  const lastToastRef = React.useRef<{ title: string; status?: string; time: number; id: string } | null>(null);

  const showLimitedToast = React.useCallback(
    (options: any) => {
      if (!options || (!options.title && options.title !== '')) return;

      let titleString = '';
      if (typeof options.title === 'string') {
        titleString = options.title.trim();
      } else if (options.title) {
        titleString = String(options.title).trim();
      }

      if (!titleString || titleString === 'undefined') {
        titleString = options.status === 'error' ? 'An unexpected error occurred.' : 'Notification';
      }

      const now = Date.now();
      const status = options.status || 'info';

      const lastToast = lastToastRef.current;
      const isSameMessage =
        lastToast &&
        lastToast.title === titleString &&
        lastToast.status === status;

      const isCurrentlyActive = lastToast?.id ? toast.isActive(lastToast.id) : false;

      if (isSameMessage && isCurrentlyActive && now - lastToast.time < 3500) {
        return;
      }

      toast.closeAll();

      const newToastId =
        options.id ||
        `toast-${status}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      lastToastRef.current = {
        title: titleString,
        status,
        time: now,
        id: newToastId,
      };

      toast({
        duration: 4000,
        isClosable: true,
        ...options,
        id: newToastId,
        title: titleString,
      });
    },
    [toast]
  );

  const renderBotUrl = (user: any) => {
    if (user?.chatbotUrl && user.chatbotUrl.trim() !== "") {
      return user.chatbotUrl;
    }
    const status = (user?.emailStatus || "").toLowerCase();
    if (status === "processing" || status === "pending" || status === "resend") {
      return (
        <Box className={styles.threeDots}>
          <Box as="span" className={styles.dot} />
          <Box as="span" className={styles.dot} />
          <Box as="span" className={styles.dot} />
        </Box>
      );
    }
    return "NA";
  };

  const renderEmailStatus = (statusRaw: string) => {
    const status = (statusRaw || "").toLowerCase();
    if (status === "send" || status === "sent") {
      return (
        <Text display="flex" alignItems="center">
          <Image src={SignedUpTrue} alt="Sent" />
          <Text as="span" ml="8px">
            Sent
          </Text>
        </Text>
      );
    }
    if (status === "notsend" || status === "failed") {
      return (
        <Text display="flex" alignItems="center">
          <Image src={SignedUpFailed} alt="Failed" />
          <Text as="span" ml="8px">
            Failed
          </Text>
        </Text>
      );
    }
    if (status === "resend") {
      return (
        <Text display="flex" alignItems="center">
          <Image src={SignedUpResend} alt="Resent" />
          <Text as="span" ml="8px">
            Resent
          </Text>
        </Text>
      );
    }
    if (status === "processing" || status === "pending") {
      return (
        <Text display="flex" alignItems="center">
          <Image src={SignedUpProcessing} alt="Processing" />
          <Text as="span" ml="8px">
            Processing
          </Text>
        </Text>
      );
    }
    return (
      <Text display="flex" alignItems="center">
        <Image src={SignedUpFailed} alt="Failed" />
        <Text as="span" ml="8px">
          Failed
        </Text>
      </Text>
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page + 1);
    setForcePage(page);
  };

  const handleItemsPerPageChange = (event: any) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };
  const handleURLClick = React.useCallback(async () => {
    onOpen();
    // setCrawlDatLoading(data);
    // setCrawlDatLoading(data);
    // const resposne = await fetchKnowledgebaseCrawlDataDetails(knowledgebaseId, crawlDataId);
    // setCrauledDataDetail(resposne.data?.content);
  }, [onOpen]);

  const inviteUserData = async (page: number, pageSize: number, searchKeyword: string, isSilent: boolean = false) => {
    try {
      if (!isSilent) setisfetching(true);
      const response = await getInviteUser(page, pageSize, searchKeyword);
      setInviteUsersData(response?.data);
    } catch (error) {
      // console.error('Failed to fetch users:', error);
    } finally {
      if (!isSilent) setisfetching(false);
    }
  }

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchValue(searchValue);

      if (searchValue !== "") {
        setIsSearchActive(true);
        setCurrentPage(1);
        setForcePage(0);
      } else {
        setIsSearchActive(false);
      }
    }, 1500);

    return () => clearTimeout(handler);
  }, [searchValue]);

  React.useEffect(() => {
    inviteUserData(currentPage, itemsPerPages, debouncedSearchValue);
  }, [currentPage, itemsPerPages, debouncedSearchValue]);

  const handleInputChange = (event: any) => {
    setSearchValue(event.target.value); // Update state with the input value
  };


  const sendReinvite = async (id: number) => {
    setReinvitingId(id);

    // Optimistically update the specific user row in state right away so status & 3 dots update instantly
    setInviteUsersData((prevData: any) => {
      if (!prevData?.data?.getAllScrapedData) return prevData;
      const updatedList = prevData.data.getAllScrapedData.map((item: any) => {
        if (item._id === id) {
          return {
            ...item,
            emailStatus: "processing",
            chatbotUrl: "",
          };
        }
        return item;
      });
      return {
        ...prevData,
        data: {
          ...prevData.data,
          getAllScrapedData: updatedList,
        },
      };
    });

    try {
      setUserId(id);
      const response: any = await ScrapLeadsReinvite(id);
      setIsDisplay(true);

      showLimitedToast({
        title: `${response.data.message}`,
        status: "success",
        isClosable: true,
      });

      // Refetch updated data silently without causing table loading flickering
      await inviteUserData(currentPage, itemsPerPages, debouncedSearchValue, true);
    } catch (error: any) {
      showLimitedToast({
        title: `${error.response?.data?.message || error?.message || "Failed to reinvite"}`,
        status: "error",
        isClosable: true,
      });
      setIsDisplay(false);
      await inviteUserData(currentPage, itemsPerPages, debouncedSearchValue, true);
    } finally {
      setReinvitingId(null);
    }
  }

  const viewProfile = async (id: number) => {
    try {
      const response: any = await ScrapUserProfile(id);
      setIsOpens(true);
      setUserProfiles(response.data.data);
    } catch (error: any) {

      showLimitedToast({
        title: `${error.response?.data?.message || error?.message}`,
        status: "error",
        isClosable: true,
      });

    }
  }
  const onCloses = () => {
    setIsOpens(false);
  }

  return (
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
    >
      <VStack w="100%" spacing="10">
        <Flex
          shrink={0}
          w="100%"
          // direction="column"
          justifyContent="space-between"
        >
          <Box>
            <Heading fontSize="24px" color="#1A202C">Scraped Leads Data</Heading>
          </Box>
          <Flex justifyContent="space-between" gap={"12px"} align={"center"}>
            <Flex justifyContent="flex-end">
              <InputGroup
                width="240px"
                outline={"none"}
                background={"#fff"}
                borderRadius="4px"
              // borderColor="#6C757D"
              >
                <InputLeftElement pointerEvents='none'>
                  <IoIosSearch color="#6C757D" />
                </InputLeftElement>
                <Input type='text' placeholder='Search' border="1px solid #CED4DA" color="#6C757D" value={searchValue}
                  onChange={handleInputChange} />
              </InputGroup>
            </Flex>
            <Box>
              <Button color={"white"} fontWeight={500} colorScheme="blue" size='md' className="btn-hover-pri" onClick={() => {
                handleURLClick()
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clip-path="url(#clip0_1734_5999)">
                    <rect width="16" height="16" fill="white" fill-opacity="0.01" />
                    <g clip-path="url(#clip1_1734_5999)">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.585451 2.58481C0.960523 2.20974 1.46923 1.99902 1.99966 1.99902H13.9997C14.5301 1.99902 15.0388 2.20974 15.4139 2.58481C15.7889 2.95988 15.9997 3.46859 15.9997 3.99902V8.49902C15.9997 8.63163 15.947 8.75881 15.8532 8.85258C15.7594 8.94635 15.6323 8.99902 15.4997 8.99902C15.3671 8.99902 15.2399 8.94635 15.1461 8.85258C15.0523 8.75881 14.9997 8.63163 14.9997 8.49902V5.38202L7.99966 9.58202L6.67366 8.78702L1.03366 12.258C1.09068 12.4706 1.21625 12.6585 1.3909 12.7925C1.56556 12.9264 1.77954 12.9991 1.99966 12.999H7.49966C7.63227 12.999 7.75945 13.0517 7.85322 13.1455C7.94699 13.2392 7.99966 13.3664 7.99966 13.499C7.99966 13.6316 7.94699 13.7588 7.85322 13.8526C7.75945 13.9463 7.63227 13.999 7.49966 13.999H1.99966C1.47096 13.999 0.963761 13.7897 0.588975 13.4168C0.214188 13.0439 0.00230783 12.5377 -0.000335693 12.009V3.99902C-0.000335693 3.46859 0.210378 2.95988 0.585451 2.58481ZM0.999664 11.104L5.70766 8.20702L0.999664 5.38202V11.104ZM0.999664 3.99902V4.21602L7.99966 8.41602L14.9997 4.21602V3.99902C14.9997 3.73381 14.8943 3.47945 14.7068 3.29192C14.5192 3.10438 14.2649 2.99902 13.9997 2.99902H1.99966C1.73445 2.99902 1.48009 3.10438 1.29256 3.29192C1.10502 3.47945 0.999664 3.73381 0.999664 3.99902Z" fill="white" />
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M14.9745 14.9739C15.6309 14.3175 15.9997 13.4273 15.9997 12.499C15.9997 11.5708 15.6309 10.6805 14.9745 10.0241C14.3182 9.36777 13.4279 8.99902 12.4997 8.99902C11.5714 8.99902 10.6812 9.36777 10.0248 10.0241C9.36841 10.6805 8.99966 11.5708 8.99966 12.499C8.99966 13.4273 9.36841 14.3175 10.0248 14.9739C10.6812 15.6303 11.5714 15.999 12.4997 15.999C13.4279 15.999 14.3182 15.6303 14.9745 14.9739ZM13.8229 10.7543C13.8879 10.7639 13.9503 10.7863 14.0067 10.82C14.063 10.8538 14.1122 10.8983 14.1513 10.951C14.1904 11.0038 14.2188 11.0637 14.2348 11.1274C14.2507 11.1911 14.254 11.2573 14.2444 11.3223C14.2348 11.3873 14.2124 11.4497 14.1787 11.506L12.8437 13.732C12.785 13.8298 12.7048 13.9129 12.6092 13.9751C12.5136 14.0372 12.405 14.0767 12.2918 14.0906C12.1786 14.1045 12.0638 14.0924 11.9559 14.0552C11.8481 14.018 11.7502 13.9567 11.6697 13.876L10.8957 13.103C10.8018 13.0091 10.749 12.8818 10.749 12.749C10.749 12.6162 10.8018 12.4889 10.8957 12.395C10.9896 12.3011 11.1169 12.2484 11.2497 12.2484C11.3824 12.2484 11.5098 12.3011 11.6037 12.395L12.1507 12.942L13.3207 10.992C13.3544 10.9357 13.3989 10.8865 13.4517 10.8474C13.5044 10.8083 13.5643 10.7799 13.628 10.7639C13.6917 10.7479 13.758 10.7447 13.8229 10.7543Z" fill="white" />
                    </g>
                  </g>
                  <defs>
                    <clipPath id="clip0_1734_5999">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                    <clipPath id="clip1_1734_5999">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                <Text as="span" ms="8px">
                  Scrape New Leads
                </Text>
              </Button>

            </Box>
          </Flex>

        </Flex>
      </VStack>

      <Box mt="20px" minW="100%" w="600px">
        <TableComponent
          height="calc(100vh - 280px)" // height for vertical scroll
          isLoading={isfetching}
          data={inviteUsersData?.data?.getAllScrapedData || []}
          // noDataText="No SMTP settings found."
          tableHeader={["Date", "Website URL", "Admin’s Email ID", "Bot URL", "Email Status", "Sign Up Status", "Action"]}
          customRowRenderer={(user: any, index: number) => {
            return (
              <Tr key={index} className={styles.tableTd}>
                <Td fontSize="14px" fontWeight="400" color="#888">
                  {index + 1 + (currentPage - 1) * itemsPerPages}
                </Td>
                <Td fontSize="14px" fontWeight="400" color="#888">{format(new Date(user?.updatedAt), 'dd/MM/yyyy, hh:mm a')}</Td>
                <Td style={{ width: '400px', maxWidth: '400px', wordWrap: "break-word", wordBreak: "break-all", whiteSpace: 'normal' }} fontSize="14px" fontWeight="400" color="#1A202C">{user.websiteUrl || "NA"}</Td>
                <Td fontSize="14px" fontWeight="400" color="#1A202C">{user.email || "NA"}</Td>
                <Td style={{ width: '400px', maxWidth: '400px', wordWrap: "break-word", wordBreak: "break-all", whiteSpace: 'normal' }}>{renderBotUrl(user)}</Td>
                <Td fontSize="14px" minW={"140px"} whiteSpace="nowrap" fontWeight="400" color="#1A202C">{renderEmailStatus(user.emailStatus)}</Td>
                <Td fontSize="14px" minW={"150px"} fontWeight="400" color="#1A202C">
                  {user.signUpStatus ? <Text display="flex">
                    <Image src={SignedUpTrue} alt='SignedUp' /><Text as="span" ml="8px">Signed Up</Text></Text > :
                    <Text display="flex">
                      <Image src={SignedUpFailed} alt='NotSignedUp' /><Text as="span" ml="8px">Didn’t Sign Up</Text></Text >
                  }
                </Td>
                <Td textAlign={'end'}>
                  {user.emailStatus == "resend" ? user.signUpStatus == true ? <Button fontWeight={500} color={"#2977FF"} variant='ghost' onClick={() => viewProfile(user._id)}>View Profile</Button> : <Button fontWeight={500} color="#2977FF" variant='ghost' isDisabled>Reinvite</Button> :
                    <Button fontWeight={500} color='#2977FF' variant='ghost' isDisabled={user._id == userId ? isDisplay : false} onClick={() => sendReinvite(user._id)}>
                      {reinvitingId === user._id ?
                        <div className="loader" style={{ textAlign: "center", display: "flex" }}><Spinner color="#2977FF" /> </div> : 'Reinvite'}
                    </Button>
                  }
                </Td>
              </Tr>
            )
          }}
        />

      </Box>
      {inviteUsersData?.data?.totalCount > 10 && <Box>
        <HStack w="100%" justifyContent="space-between" py={4}>
          <Flex alignItems="center">
            <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total
              {' ' + inviteUsersData?.data?.totalCount + ' '}
              items</Text>
            {inviteUsersData?.data == undefined ? null : <PaginatorTwo forcePage={forcePage} onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={inviteUsersData?.data?.pages} />}
          </Flex>
          <Flex alignItems="center">
            <Select
              value={itemsPerPages}
              onChange={handleItemsPerPageChange}
              width="auto"
              color="#6C757D"
              bg={'#fff'}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </Select>
          </Flex>
        </HStack>
      </Box>}
      <GmbSearch isOpen={isOpen} onClose={onClose} inviteUserData={inviteUserData} />
      <Modal isOpen={isOpens} onClose={onCloses} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>View Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box
              borderWidth="1px"
              // borderRadius="lg"
              overflow="hidden"
              // p="6"
              // boxShadow="md"
              bg={useColorModeValue('white', 'gray.800')}
              display="flex"
              flexDirection={{ base: 'column', md: 'row' }}
            >

              <Box flex="1 1 50%">
                <Table variant="simple" size="sm">
                  <Tbody className='profileEdit'>

                    <Tr>
                      <Th>Email</Th>
                      <Td>
                        <Text>
                          {userProfileS === undefined ? null : userProfileS.email}
                        </Text>
                      </Td>
                    </Tr>
                    <Tr>
                      <Th>Role</Th>
                      <Td>
                        <Text>
                          {userProfileS === undefined ? null : userProfileS.role}
                        </Text>
                      </Td>
                    </Tr>
                    <Tr>
                      <Th>Joined On</Th>
                      <Td>
                        <Text>
                          {userProfileS === undefined ? null : format(new Date(userProfileS?.createdAt), 'dd/MM/yyyy, hh:mm a')}
                        </Text>
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme='blue' fontWeight={500} onClick={onCloses}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>


    </Box>

  );
};
