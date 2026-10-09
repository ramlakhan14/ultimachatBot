import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  HStack,
  Select,
  useToast,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter
} from "@chakra-ui/react";
import { IoIosSearch } from "react-icons/io";
import DeleteMail from "../../../components/Icons/email-assistant/deletemail.svg";
import { PaginatorTwo } from "../../../widgets/Paginator/PaginatorTwo";
import CreateWebhookModal from "../Modal/CreateWebhookModal";
import { fetchAllHooks, deleteHooks } from "../../../services/zapierservice";
import { GoInfo } from "react-icons/go";
import { colors } from "../../../utils/constant";
import { format } from 'date-fns';


const instruction = `<strong>Receive leads in UltimaBot from CRM via Zapier (Inbound Webhook)</strong>
1. Login / Sign up on Zapier → Go to Dashboard → Click  <a href="https://zapier.com/app/login" style="color:#2977FF" target="_blank" rel="noopener noreferrer">Create</a> → <strong>Zaps</strong>.
2. Create a Zap → Click on <strong>Trigger</strong> → Select your CRM (e.g., HubSpot or any other).
3. Sign in to your CRM → Select <strong>Trigger Event</strong> (New Contact) → Click Continue.
4. In <strong>Additional properties</strong>, search and select <strong>Contact information</strong> → Click Continue.
5. Add a new contact in your CRM (or skip) → Go back to Zapier → Click <strong>Test Trigger</strong> → Confirm fetched record → Click <strong>Continue with selected record</strong>.
6. Add Action → Select <strong>Webhooks by Zapier</strong> → Choose <strong>"POST"</strong> → Click Continue.
7. Click on Create zapier Webhook on right top.
8. Copy <strong>Webhook URL & Secret</strong> from UltimaBot (Receive leads from Zapier) → Paste the Webhook URL in the URL field.
9. Configure settings:
&nbsp;&nbsp;&nbsp;• Wrap Request In Array → <strong>Yes</strong>
&nbsp;&nbsp;&nbsp;• Add Headers:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Key → <strong>x-ultimabot-secret</strong>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Value → <strong>Your UltimaBot Secret Key</strong>
10. Click Continue → Click <strong>Test Step</strong> → Verify data is received in UltimaBot (Leads section).
11. Publish / Turn On the Zap → Integration is LIVE ✅
<strong>Disclaimer:</strong> We are not responsible for changes made by third-party applications. Any updates may affect the process, and users may need to adjust accordingly. We will update the steps once informed.
`


function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
const CreateWebhook: React.FC = () => {
  const [searchEmailQuery, setSearchEmailQuery] = useState<string>("");
  const [selectedWebhookIds, setSelectedWebhookIds] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [itemsPerPages, setItemsPerPages] = useState<number>(10);
  const [pageCount, setPageCount] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isConfirm, setIsConfirm] = React.useState<string | undefined>();

  const debouncedSearchQuery = useDebounce(searchEmailQuery, 1500);

  const toast = useToast();

  const onClose = () => {
    setIsOpen(false);
  }

  const [webhookData, setWebhookData] = useState<any>({ data: [] });

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedWebhookIds(webhookData.data.data.map((webhook: any) => webhook._id));
    } else {
      setSelectedWebhookIds([]);
    }
  };

  const toggleSelectWebhook = (id: string) => {
    setSelectedWebhookIds(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const handlePageChange = React.useCallback((page: number) => {
    setCurrentPage(page + 1);
  }, [setCurrentPage]);

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemsPerPage = parseInt(e.target.value);
    setItemsPerPages(newItemsPerPage);
  };

  const handleCreateWebhook = () => {
    setIsOpen(true);
  };

  async function fetchHooks(searchKey: string, page: number, limit: number) {
    try {
      setIsFetching(true);
      const response: any = await fetchAllHooks(searchKey, page, limit);
      // console.log(response, 'response');
      setWebhookData(response);
      setPageCount(response.data.pagination.totalPages);
    } catch (error) {
      // console.error("Error fetching notifications:", error);
    } finally {
      setIsFetching(false);
    }
  }

  React.useEffect(() => {
    fetchHooks(debouncedSearchQuery, currentPage, itemsPerPages);
  }, [debouncedSearchQuery, currentPage, itemsPerPages]);

  const handleSelectedDelete = async () => {
    if (selectedWebhookIds.length === 0) return;

    try {
      const response = await deleteHooks(selectedWebhookIds);
      if (response.status === 200) {
        toast({
          title: "Webhooks deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        setIsConfirm("")
        setSelectedWebhookIds([]);
        fetchHooks('', currentPage, itemsPerPages);
      }
    } catch (error) {
      toast({
        title: "Error deleting webhooks",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSingleDelete = async (webHookId: string) => {
    try {
      const response = await deleteHooks([webHookId]);
      if (response.status === 200) {
        toast({
          title: "Webhook deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        setIsConfirm("")
        setSelectedWebhookIds([]);
        fetchHooks('', currentPage, itemsPerPages);
      }
    } catch (error) {
      toast({
        title: "Error deleting webhook",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (<>
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
    >
      <VStack w="100%" spacing="5">
        <Flex
          shrink={0}
          w="100%"
          direction="column"
          justifyContent="space-between"
        >
          <Flex width="100%" justifyContent="space-between" alignItems={"center"}>
            <Box maxW={"50%"}>

              <Heading fontSize="24px" color="#1A202C" lineHeight="32px">
                {/* Zapier Webhooks */}
                Receive Leads from Zapier

              </Heading>
              <Text fontSize={"16px"} fontWeight={400} color="#6C757D">
                Importing leads generated from external CRM systems into the UltimaBot tool using Zapier integration
              </Text>
            </Box>
            <Flex gap={"15px"}>
              <Flex w="100%" justifyContent="space-between">
                <Flex marginLeft={"auto"} fontSize="12px" gap={3} fontWeight="400" color="#6C757D">
                  <Button
                    colorScheme="red"
                    color="white"
                    padding="5px"
                    _focus={{ boxShadow: "none" }}
                    isDisabled={selectedWebhookIds.length === 0}
                    onClick={() => setIsConfirm("bulk")}
                  >
                    <Image src={DeleteMail} />
                  </Button>
                  <InputGroup
                    borderRadius="4px"
                    outline={"none"}
                    // borderColor="#6C757D"
                    bg="white"
                    maxW={'250px'}
                  >
                    <InputLeftElement pointerEvents="none">
                      <IoIosSearch color="#6C757D" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search"
                      outline={"none"}
                      border="1px solid #CED4DA"

                      value={searchEmailQuery}
                      onChange={(e) => setSearchEmailQuery(e.target.value)}
                    />
                  </InputGroup>
                </Flex>
              </Flex>
              <Box display={'flex'} alignItems={'center'}>
                <Button
                  mr="12px"
                  size="md"
                  colorScheme="blue"
                  gap={"6px"}
                  // px="16px"
                  className="btn-hover-pri"
                  onClick={handleCreateWebhook}
                  sx={{
                    fontWeight: "500",
                    _focus: {
                      boxShadow: 'none',
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clip-path="url(#clip0_9459_11663)">
                      <rect width="16" height="16" fill="white" fill-opacity="0.01" />
                      <path d="M7.99915 1.99805C8.13175 1.99805 8.25987 2.05076 8.35364 2.14453C8.44729 2.23818 8.49902 2.36562 8.49915 2.49805V7.49805H13.4991C13.6318 7.49805 13.7599 7.55076 13.8536 7.64453C13.9473 7.73818 13.999 7.86562 13.9991 7.99805C13.9991 8.13066 13.9474 8.25877 13.8536 8.35254C13.7599 8.44631 13.6318 8.49805 13.4991 8.49805H8.49915V13.498C8.49915 13.6307 8.44741 13.7588 8.35364 13.8525C8.25987 13.9463 8.13175 13.998 7.99915 13.998C7.86671 13.9979 7.73928 13.9462 7.64563 13.8525C7.55186 13.7588 7.49915 13.6307 7.49915 13.498V8.49805H2.49915C2.36671 8.49792 2.23928 8.44619 2.14563 8.35254C2.05186 8.25877 1.99915 8.13066 1.99915 7.99805C1.99927 7.86561 2.05198 7.73819 2.14563 7.64453C2.23928 7.55088 2.36671 7.49817 2.49915 7.49805H7.49915V2.49805C7.49927 2.36561 7.55198 2.23819 7.64563 2.14453C7.73928 2.05088 7.86671 1.99817 7.99915 1.99805Z" fill="white" />
                    </g>
                    <defs>
                      <clipPath id="clip0_9459_11663">
                        <rect width="16" height="16" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>

                  <Text as="span" fontSize={"16px"} fontWeight={"500"}>
                    Create Zapier Webhook
                    {/* Receive Leads from Zapier */}
                  </Text>
                </Button>
                <Popover isOpen={isPopoverOpen} onClose={() => setIsPopoverOpen(false)}>
                  <PopoverTrigger>
                    <Box
                      cursor="pointer"
                      as="span"
                      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                    >
                      <GoInfo size={"18px"} color="#6C757D" />
                    </Box>
                  </PopoverTrigger>
                  <PopoverContent
                    bg="#fff"
                    fontWeight={400}
                    color="#333"
                    p={4}
                    width="500px"
                    marginRight={"20px"}
                    sx={{
                      scrollbarWidth: "none", // Firefox
                      "&::-webkit-scrollbar": {
                        display: "none", // Chrome, Safari
                      },
                    }}
                    height={"400px"}
                    overflowY={"scroll"}
                    fontSize="14px"
                    border="1px solid #ccc"
                    lineHeight="20px"
                    style={{ boxShadow: 'rgba(12, 12, 13, 0.05) 0px 1px 4px 0px' }}
                    borderRadius="4px"
                  >
                    <PopoverArrow bg="#fff" transform="scale(1.5)" />
                    {/* <PopoverCloseButton /> */}
                    <Box lineHeight={"25px"} whiteSpace="pre-wrap" dangerouslySetInnerHTML={{ __html: instruction }}></Box>
                  </PopoverContent>
                </Popover>
              </Box>
            </Flex>
          </Flex>
        </Flex>
      </VStack>

      <Box minW={"100%"} w="600px">
        <TableContainer
          maxH="calc(100vh - 215px)" // height for vertical scroll
          mt={'24px'}
          w="100%"
          boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
          bg={'#fff'}
          border="1px solid #E2E8F0"
          borderRadius="4px"
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
              <Tr >
                <Th width="70px">
                  <Checkbox
                    borderColor="#6C757D"
                    isChecked={webhookData?.data?.data?.length > 0 && selectedWebhookIds.length === webhookData?.data?.data?.length}
                    onChange={toggleSelectAll}
                  />
                </Th>
                <Th>CRM Name</Th>
                <Th width={'270px'}>Webhook URL</Th>
                <Th>Webhook Secret</Th>
                <Th>Request Type</Th>
                <Th>Date / Time</Th>
                <Th textAlign="right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isFetching ? (
                <Tr>
                  <Td colSpan={7}>
                    <Spinner
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      margin="auto"
                      marginTop="50px"
                      marginBottom="50px"
                    />
                  </Td>
                </Tr>
              ) : webhookData?.data?.data?.length > 0 ? (
                webhookData.data.data.map((webhook: any, index: number) => (
                  <Tr key={index}>
                    <Td >
                      <Checkbox
                        borderColor="#6C757D"
                        isChecked={selectedWebhookIds.includes(webhook._id)}
                        onChange={() => toggleSelectWebhook(webhook._id)}
                      />
                    </Td>
                    <Td textTransform={"capitalize"}>{webhook.crmName}</Td>
                    <Td maxWidth="250px"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="normal"
                      wordBreak="break-word"
                    >
                      <Text wordBreak="break-word"
                        overflowWrap="break-word"
                        whiteSpace="normal">
                        {webhook.webhookUrl}
                      </Text>
                    </Td>
                    <Td>{webhook.webhookSecret}</Td>
                    <Td>{webhook.requestType}</Td>
                    <Td>
                      {/* {new Date(webhook.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })} */}
                      {format(new Date(webhook.createdAt), 'dd/MM/yyyy, hh:mm a')}
                    </Td>
                    <Td textAlign="right">
                      <Tooltip label="Delete" fontSize={"11px"}>
                        <Button
                          padding="5px"
                          size="sm"
                          colorScheme="red"
                          _focus={{ boxShadow: "none" }}
                          onClick={() => setIsConfirm(webhook._id)}
                        >
                          <Image src={DeleteMail} />
                        </Button>
                      </Tooltip>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={7} textAlign="center">
                    <Text color="#6C757D" fontSize="14px">
                      {searchEmailQuery.trim()
                        ? "No CRM matches your search criteria"
                        : "No webhooks available"}
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
        {
          webhookData?.data?.pagination?.totalItems > 10 &&
          <HStack w="full" justifyContent="space-between" py={4}>
            <Flex alignItems="center">
              <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">
                Total {webhookData?.data?.pagination?.totalItems} items
              </Text>
              <PaginatorTwo
                onPageChange={handlePageChange}
                pageRangeDisplayed={5}
                pageCount={pageCount}
              />
            </Flex>
            <Flex alignItems="center">
              <Select
                defaultValue={itemsPerPages}
                bg="white"
                onChange={handleItemsPerPageChange}
                width="auto"
                color="#6C757D"
                mr="8px"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </Select>
            </Flex>
          </HStack>
        }

      </Box>
    </Box>

    <Modal isCentered onClose={() => setIsConfirm("")} isOpen={!!isConfirm}>
      <ModalOverlay />
      <ModalContent>
        <ModalBody>
          <Box
            textAlign="center"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
          >
            <Image src={"/icons/error.svg"} alt="deleteicon" w="56px" h="56px" />
            <Text as="p" fontSize="18px" fontWeight="700" color="#1A202C" mb="8px" mt="24px">
              Are you sure?
            </Text>
            <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">
              {/* You want to delete ? */}
              Are you sure you want to delete the selected Zapier hook(s)? This action cannot be undone.
            </Text>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="blue"
            className="btn-hover-pri"
            mr={3}
            onClick={() => {
              if (isConfirm === "bulk") {
                handleSelectedDelete()
              } else if (isConfirm && isConfirm !== "bulk") {
                handleSingleDelete(isConfirm)
              }
            }}
            fontSize="16px"
            fontWeight={"500"}
          >
            Confirm
          </Button>
          <Button
            colorScheme="gray"
            fontWeight={"500"}
            mr={3}
            onClick={() => setIsConfirm("")}
          >
            <Text as="span" ms="4px" fontSize="16px" fontWeight="400">
              Cancel
            </Text>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    <CreateWebhookModal isOpen={isOpen} onClose={onClose} fetchHooks={fetchHooks} />
  </>);
};

export default CreateWebhook;