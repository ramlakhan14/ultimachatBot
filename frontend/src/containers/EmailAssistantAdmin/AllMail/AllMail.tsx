import { Box, Button, Flex, Heading, VStack, Text, Image, Grid, GridItem, Spinner, Select, useToast } from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import createFolder from '../../../components/Icons/create-folder.svg';
import Draft from '../../../components/Icons/Draft.svg';
import FollowUp from '../../../components/Icons/Follow-up.svg';
import Unresolved from '../../../components/Icons/Unresolved.svg';
import styles from "./AllMail.module.scss";
import SvgExport from "./SvgExport";
import { Link } from 'react-router-dom';
import LeadGenerated from "../../../components/Icons/Lead-generated.svg";
import ChatSummary from "../../../components/Icons/chatsummary.svg";
import AutoReplies from "../../../components/Icons/autoreplies.svg";
import ImgFolder from "../../../components/Icons/imgFolder.svg";
import IcPen from "../../../components/Icons/ic-pen.svg";
import DeleteRed from "../../../components/Icons/deletered.svg";
import CreateFolder from '../Modal/CreateFolder/CreateFolder';
import { deleteUserCreatedFolder, fetchFolderList } from '../../../services/emailassistantservice';
import EditFolder from '../Modal/EditFolder/EditFolder';
import DeleteFolderAlertDialog from '../Modal/DeleteFolderAlertDialog/DeleteFolderAlertDialog';
import { callApi } from '../../../services/callApi';


const AllMail = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [folderData, setFolderData] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [filterType, setfilterType] = useState<any>("");
  const [emailProject, setemailProject] = useState<any>();
  const [campaignId, setCampaignId] = useState<any>();

  const toast = useToast();

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string, name: string } | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const excludeFolders = ["Email Summary", "Leads Generated", "Auto Replies", "Unresolved", "Followup Conversations", "Draft"];

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const onEditOpen = (fData: any) => {
    setCurrentData(fData);
    setIsEditOpen(true);
  }
  const onEditClose = () => setIsEditOpen(false);

  async function fetchFolderData() {
    try {
      setIsFetching(true);
      const response: any = await fetchFolderList(filterType, campaignId, emailProject);
      // console.log(response.data, "folder api response");
      setFolderData(response.data);
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}` || error.message,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsFetching(false);
    }
  }

  const openDeleteAlert = (id: string, name: string) => {
    setFolderToDelete({ id, name });
    setIsDeleteAlertOpen(true);
  };

  const closeDeleteAlert = () => {
    setIsDeleteAlertOpen(false);
    setFolderToDelete(null);
  };

  const confirmDeleteFolder = async () => {
    if (folderToDelete) {
      try {
        await deleteFolder(folderToDelete.id);
      } catch (error: any) {
        toast({
          title: `${error?.response?.data?.message}` || error.message,
          status: "error",
          isClosable: true,
        });
      }
    }
    closeDeleteAlert();
  };

  const deleteFolder = async (id: string) => {
    try {
      const response: any = await deleteUserCreatedFolder(id);
      fetchFolderData();
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}` || error.message,
        status: "error",
        isClosable: true,
      });
    } finally {

    }
  }

  const [projects, setProjects] = useState([])
  const [campaigns, setcampaigns] = useState([])
  const [smtpsConnections, setSmtpsConnections] = useState([])

  const fetchProjects = async () => {
    try {
      const response = await callApi(
        "/emailAssistance/projects",
        "get",
        ""
      );
      // setIsLoading("")
      setProjects(response?.data || [])

    } catch (err: any) {
      // setIsLoading("")
      toast({
        title: err?.response?.data?.message || err?.message || "Upgrade failed",
        status: "error",
      });
    }
  }
  const fetchSmpts = async () => {
    try {
      const response = await callApi(
        "/emailAssistance/assistantEmails",
        "get",
        ""
      );
      // setIsLoading("")
      setSmtpsConnections(response?.data || [])
      // console.log("response", response);

    } catch (err: any) {
      // setIsLoading("")
      toast({
        title: err?.response?.data?.message || err?.message || "Upgrade failed",
        status: "error",
      });
    }
  }
  const getCampaign = async (id: any) => {
    try {
      const response = await callApi(
        `/emailAssistance/campaigns?projectId=${id}`,
        "get",
        ""
      );
      // setIsLoading("")
      setcampaigns(response?.data || [])
      // console.log("response", response);

    } catch (err: any) {
      // setIsLoading("")
      toast({
        title: err?.response?.data?.message || err?.message || "Upgrade failed",
        status: "error",
      });
    }
  }

  function capitalizeWords(str: string) {
    return str.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }

  // useEffect(() => {
  //   if (filterType === "emailAssistant" && emailProject) {
  //     fetchFolderData();
  //   }
  //   // console.log("emailProject", emailProject);

  // }, [emailProject]);

  // useEffect(() => {
  //   if (filterType === "emailOutreach" && campaignId) {
  //     fetchFolderData();
  //   }
  // }, [campaignId]);

  useEffect(() => {
    fetchFolderData();
    // if (filterType === "" && (!campaignId || !emailProject)) {
    // }
  }, [filterType, campaignId, emailProject]);

  useEffect(() => {
    fetchFolderData();
    fetchProjects()
    fetchSmpts()
  }, []);



  return (<>
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
    >
      <Box w="100%">
        <VStack w="100%" spacing="10">
          <Flex
            shrink={0}
            w="100%"
            direction="column"
            justifyContent="space-between"
          >
            <Flex width="100%" justifyContent="space-between" alignItems={"center"}>

              <Flex gap={"12px"} align={"center"}>
                <Box minW={"225px"}>
                  <Heading fontSize="24px" color="#1A202C">
                    {/* Email Management */}
                    Email Conversation

                  </Heading>
                </Box>
                <Select
                  // placeholder="Email Outreach"
                  bg="white"
                  fontWeight={"600"}
                  width="166px"
                  onChange={(e: any) => {
                    setcampaigns([])
                    const value = e.target?.value
                    setfilterType(value)
                    // console.log("value", value);
                    setCampaignId("")
                    setemailProject("")

                    if (value == "") {
                      setemailProject("")
                    }

                  }}
                >
                  <option value={""}>Select</option>
                  <option value={"emailOutreach"}>Email Outreach</option>
                  <option value={"emailAssistant"}>Email Assistant</option>

                </Select>
                {
                  filterType &&
                  <Select
                    placeholder={filterType == "emailOutreach" ? "Select Projects" : "Select Email Connections"}
                    bg="white"
                    width={filterType == "emailOutreach" ? "166px" : "230px"}
                    value={emailProject || ""}
                    onChange={(e: any) => {

                      setemailProject(e.target.value);
                      setCampaignId("");
                      setcampaigns([]);

                      if (filterType === "emailOutreach" && e.target.value) {
                        getCampaign(e.target.value);
                      }
                    }}
                  >
                    {
                      filterType == "emailOutreach" ?
                        projects?.map((item: any, index) => {
                          return (
                            <option value={item?._id} key={index}>{item?.name}</option>
                          )
                        }) :
                        <>
                          {
                            smtpsConnections?.length == 0 ?
                              <option disabled value={""}>No data found</option> :
                              emailProject == undefined ? <option disabled value={""}>No data found</option>
                                :
                                smtpsConnections?.map((item: any, index) => {
                                  return (
                                    <option value={item?.email} key={index}>{item?.email}</option>
                                  )
                                })
                          }
                        </>
                    }

                  </Select>
                }

                {
                  filterType == "emailOutreach" &&
                  <Select
                    placeholder="Select Campaign"
                    bg="white"
                    value={campaignId}
                    width="166px"
                    onChange={(e: any) => {
                      setCampaignId(e.target.value)
                    }}
                  >

                    {
                      campaigns?.length == 0 ?
                        <option disabled value={""}>No data found</option>
                        :
                        campaigns?.map((item: any, index) => {
                          return (
                            <option value={item?._id} key={index}>{item?.campaignName}</option>
                          )
                        })
                    }

                  </Select>
                }
              </Flex>
              <Box>
                <Button colorScheme='blue'
                  size='md' onClick={onOpen}
                  fontWeight={500}
                  padding={"6px 12px"}
                >
                  <Image src={createFolder} alt='icon' />
                  <Text as="span" ms="8px">
                    Create Folder
                  </Text>
                </Button>
              </Box>
            </Flex>
          </Flex>
        </VStack>
      </Box>
      <Box mt={'24px'}>
        {isFetching && <Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'100px'} />}
        {!isFetching && <Grid gap={4} templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}>
          {folderData && folderData.map((folder: any, index: number) => (
            <GridItem key={index} className='folderGridItem'>
              <Link
                //  to={excludeFolders.includes(capitalizeWords(folder.folderName))
                //   ? `/app/email-assistant/${folder._id}/${folder.folderName.toLowerCase().replace(/\s+/g, '-')}?type=${filterType}&emailOrProject=${emailProject}&campaignId=${campaignId}`
                //   : `/app/email-conversation/folder/user-created/${folder._id}/${folder.emailAccountId !== "" ? folder.emailAccountId : folder.category.toLowerCase().replace(/\s+/g, '-')}`
                // }
                to={() => {
                  const queryParams = new URLSearchParams();

                  if (filterType) {
                    queryParams.append("type", filterType);
                  }

                  if (emailProject) {
                    queryParams.append("emailOrProject", emailProject);
                  }

                  if (campaignId) {
                    queryParams.append("campaignId", campaignId);
                  }

                  const queryString = queryParams.toString();

                  return excludeFolders.includes(capitalizeWords(folder.folderName))
                    ? `/app/email-conversation/${folder._id}/${folder.folderName
                      .toLowerCase()
                      .replace(/\s+/g, "-")}${queryString ? `?${queryString}` : ""}`
                    : `/app/email-conversation/folder/user-created/${folder._id}/${folder.emailAccountId !== ""
                      ? folder.emailAccountId
                      : folder.category.toLowerCase().replace(/\s+/g, "-")
                    }${queryString ? `?${queryString}` : ""}`;
                }}
              >
                <Box className={styles.emailAssistantFolder} pos={'relative'} w='100%' boxShadow={"0px 1px 4px 0px #0C0C0D0D"} border="1px solid #E2E8F0" p={'18px'} bg={'#fff'} borderRadius="8px" lineHeight={'26px'}>
                  <Box pos={'relative'} display={'flex'} gap={3} alignItems={'center'}>
                    <Box minWidth={'40px'}>
                      {folder?.folderType === 'userCreated' ? (
                        <Image src={ImgFolder} style={{ width: '40px', height: '40px' }} />
                      ) : capitalizeWords(folder.folderName) === 'Leads Generated' ? (
                        <Image src={LeadGenerated} style={{ width: '40px', height: '40px' }} />
                      ) : capitalizeWords(folder.folderName) === 'Unresolved' ? (
                        <Image src={Unresolved} style={{ width: '40px', height: '40px' }} />
                      ) : capitalizeWords(folder.folderName) === 'Auto Replies' ? (
                        <Image src={AutoReplies} style={{ width: '40px', height: '40px' }} />
                      ) : capitalizeWords(folder.folderName) === 'Followup Conversations' ? (
                        <Image src={FollowUp} style={{ width: '40px', height: '40px' }} />
                      ) : capitalizeWords(folder.folderName) === 'Draft' ? (
                        <Image src={Draft} style={{ width: '40px', height: '40px' }} />
                      ) : capitalizeWords(folder.folderName) === 'Email Summary' ? (
                        <Image src={ChatSummary} style={{ width: '40px', height: '40px' }} />
                      ) : null}
                    </Box>
                    <Box>
                      <Text fontSize="16px" color="#1A202C" lineHeight={'24px'} fontWeight={500} wordBreak={'break-all'}>{capitalizeWords(capitalizeWords(folder.folderName) == 'Followup Conversations' ? 'Follow-up Conversations' : folder.folderName)}</Text>
                      <Text fontSize="14px" lineHeight={'150%'} color="#6C757D">{folder.count}</Text>
                    </Box>
                  </Box>
                  <Box pos={'absolute'} right={0} top={0}>
                    <SvgExport />
                  </Box>
                  {folder?.folderType === 'userCreated' ? (<Box className='action-button' pos={'absolute'} alignItems={'center'} gap={4} right={'10px'} bottom={'10px'}>
                    <Image role="button" src={IcPen} height={'20px'} width={'20px'} onClick={(event: any) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onEditOpen(folder);
                    }} />
                    <Image role="button" onClick={(event: any) => {
                      event.preventDefault();
                      event.stopPropagation();
                      // deleteFolder(folder?._id);
                      openDeleteAlert(folder._id, capitalizeWords(folder.folderName));
                    }} src={DeleteRed} height={'15px'} width={'15px'} />
                  </Box>) : null}
                </Box>
              </Link>
            </GridItem>
          ))}
        </Grid>}
      </Box>
    </Box>
    <CreateFolder isOpen={isOpen} onClose={onClose} fetchFolderData={fetchFolderData} />
    <EditFolder isEditOpen={isEditOpen} onEditClose={onEditClose} fetchFolderData={fetchFolderData} folderData={currentData} />
    <DeleteFolderAlertDialog
      isOpen={isDeleteAlertOpen}
      leastDestructiveRef={cancelRef}
      onClose={closeDeleteAlert}
      onDelete={confirmDeleteFolder}
      folderName={folderToDelete?.name || ''}
    />
  </>);
};

export default AllMail;