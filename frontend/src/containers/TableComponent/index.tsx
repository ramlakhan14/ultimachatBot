import React from 'react'
import { Box, Flex, Spinner, Button, TableContainer, useToast, Table, Thead, Tr, Th, Tbody, Td, Input, Image, Tooltip, Switch, Icon, Text, Popover, PopoverTrigger, PopoverContent, PopoverArrow } from '@chakra-ui/react';
import { colors } from '../../utils/constant';
import LastCrawledFormate from "../../utils/LastCrawledFormate";
import YesIcon from "../AllLeads/yes.svg"
import NoIcon from "../AllLeads/no.svg"
import { format } from 'date-fns';
import { formatNumber } from "../../utils/commonUtils";
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { GoInfo } from 'react-icons/go';
import { Badge } from '@chakra-ui/react';

type StatusType =
  | 'CREATED'
  | 'CRAWLING'
  | 'CRAWLED'
  | 'CRAWL_ERROR'
  | 'GENERATING_EMBEDDINGS'
  | 'EMBEDDING_ERROR'
  | 'READY';

function TableComponent({ height, isChatbotPage, isVoiceBotLead, setSelectedLead, data, actions, handleLeadsAction, noDataText, customRowRenderer, itemsPerPage, actionHandler, currentPage, tableHeader, isLoading, tableDataKeys }: any) {
  const history = useHistory()
  const location = useLocation()
  const toast = useToast();
  const [titleOpen, setTitleOpen] = React.useState<boolean>(false);

  const userProfile = useSelector((state: any) => state.user?.profile) || {}
  return (
    <TableContainer
      maxH={height ? height : "calc(100vh - 215px)"}
      mt={'24px'}
      w="100%"
      // boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
      bg={'#fff'}
      // border="1px solid #E2E8F0"
      borderRadius="8px"
      sx={{
        /* Hide ONLY vertical scrollbar */
        "&::-webkit-scrollbar:vertical": {
          width: "0px",
        },
        "&::-webkit-scrollbar-thumb:vertical": {
          background: "transparent",
        },
      }}
      overflowY="auto"
      overflowX="auto"

    >
      <Table variant="simple" sx={{
        borderCollapse: "collapse"  // ✅ important fix
      }}
        border="1px solid #E2E8F0"   // ✅ yaha shift karo
        borderRadius="8px"
      // sx={{ borderCollapse: "separate", borderSpacing: 0 }}
      >
        <Thead sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          fontSize: '14px',
          fontWeight: '600'
        }} bg={colors.tableHeadingBg}

        >
          <Tr borderTop={"none"} >
            {
              tableHeader?.length > 0 && <>
                <Th borderTop={"none"} width="70px" position="sticky" top="0" bg={colors.tableHeadingBg}>#</Th>
                {tableHeader?.map((header: any, index: any) => {
                  const checkThLenght = header.toLowerCase()?.includes("url")
                  return (
                    <Th borderTop={"none"}
                      position="sticky" top="0" bg={colors.tableHeadingBg}
                      textAlign={header === "Actions" || header == "Action" || header == 'Details' ? "right" : "left"}

                      minWidth={checkThLenght ? '400px' : "auto"} padding={'7px 16px'} key={index}>
                      {
                        header == "Usages" ?
                          <Text display={'flex'} alignItems={'center'} gap={'4px'}>
                            {header}
                            <Popover isOpen={titleOpen} onClose={() => setTitleOpen(false)}>
                              <PopoverTrigger>
                                <Box
                                  cursor="pointer"
                                  as="span"
                                  onClick={() => setTitleOpen(!titleOpen)}
                                >
                                  <GoInfo color="#6C757D" />
                                </Box>
                              </PopoverTrigger>
                              <PopoverContent
                                bg="#efefef"
                                fontWeight={500}
                                color="#333"
                                p={3}
                                width="250px"
                                fontSize="12px"
                                border="1px solid #ccc"
                                lineHeight="20px"
                                style={{ boxShadow: 'none' }}
                                borderRadius="4px"
                              >
                                <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                                {/* <PopoverCloseButton /> */}
                                <Box whiteSpace="pre-wrap">OpenAI API Key Usage
                                </Box>
                              </PopoverContent>
                            </Popover>
                          </Text> : <>
                            {header}
                          </>
                      }

                    </Th>
                  )
                })}
              </>
            }
          </Tr>
        </Thead>
        <Tbody>
          {isLoading ? (
            <Tr>
              <Td colSpan={tableHeader?.length + 1 || 8}>
                <Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'50px'} marginBottom={'50px'} />
              </Td>
            </Tr>
          ) : data.length > 0 && customRowRenderer ? (
            data.map((row: any, index: number) => customRowRenderer(row, index))
          ) : data.length > 0 ? (
            data?.map((item: any, index: any) => (
              <Tr key={index}>
                <Td>
                  {
                    currentPage && itemsPerPage ?
                      (currentPage - 1) * itemsPerPage + index + 1 : index + 1
                  }
                </Td>
                {
                  tableDataKeys.map((keyName: any, keyIndex: any) => {
                    switch (keyName.trim()) {
                      case 'name':
                        // console.log("sdfas", item, item?.IsLeadType)
                        return <Td key={keyIndex}
                          cursor={isVoiceBotLead ? "default" : "pointer"}
                          _hover={isVoiceBotLead ? {} : { color: "#2977ff" }}
                          onClick={() => {
                            if (location.pathname == "/app/all-leads") {
                              if (item?.chatSessionId && item?.IsLeadType == "chatBot") {
                                history.push(`/app/${item?.chatbotType == "vakmangids" ? "vakmangids-chatbot" : "edit-chatbot"}/${item?.knowledgebaseId}/?tab=chat-sessions&chatSessionId=${item?.chatSessionId}`)
                              } else {

                                // console.log(item?.IsLeadType, "aksdfjkajf")

                                if (item?.IsLeadType == "mailBot" || item?.IsLeadType === 'emailAssistant' || item?.IsLeadType === 'emailOutreach') {
                                  if (item?.emailConversation?._id) {
                                    history.push(`/app/email-conversation/leads-generated`, {
                                      data: item
                                    })
                                  } else {
                                    toast({
                                      title: "This lead has no active email conversation.",
                                      status: "warning",
                                      isClosable: true,
                                    });

                                  }
                                } else {
                                  toast({
                                    title: (!item?.chatSessionId && item?.IsLeadType == "chatBot") ? "This lead has no active chat session." : "This lead does not belong to ChatBot.",
                                    status: "warning",
                                    isClosable: true,
                                  });

                                }

                              }
                            }
                          }}>
                          {item[keyName] || (item[keyName] && item[keyName] ? `${item[keyName]} ${item[keyName]}` : item[keyName] || item[keyName] || '-')}
                        </Td>
                        break
                      case 'porjectName':
                        return <Td key={keyIndex}>
                          <Box display={'flex'}
                            _hover={{ color: "#2977FF" }}
                            alignItems={'center'} gap={'8px'}>
                            {/* <Icon as={} */}
                            {/* <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <g clip-path="url(#clip0_8058_43498)">
                                <path d="M0 8C0 5.87827 0.842855 3.84344 2.34315 2.34315C3.84344 0.842855 5.87827 0 8 0C10.1217 0 12.1566 0.842855 13.6569 2.34315C15.1571 3.84344 16 5.87827 16 8C16 10.1217 15.1571 12.1566 13.6569 13.6569C12.1566 15.1571 10.1217 16 8 16C5.87827 16 3.84344 15.1571 2.34315 13.6569C0.842855 12.1566 0 10.1217 0 8ZM7.5 1.077C6.83 1.281 6.165 1.897 5.613 2.932C5.43113 3.2761 5.27471 3.63305 5.145 4H7.5V1.077ZM4.09 4C4.25667 3.46882 4.47087 2.95373 4.73 2.461C4.90291 2.13406 5.10259 1.82199 5.327 1.528C4.088 2.04183 3.02201 2.89962 2.255 4H4.09ZM3.508 7.5C3.538 6.623 3.646 5.782 3.82 5H1.674C1.30112 5.78505 1.07861 6.63301 1.018 7.5H3.508ZM4.847 5C4.65032 5.8198 4.53707 6.6574 4.509 7.5H7.5V5H4.847ZM8.5 5V7.5H11.49C11.4623 6.65743 11.3494 5.81983 11.153 5H8.5ZM4.51 8.5C4.53774 9.34257 4.65065 10.1802 4.847 11H7.5V8.5H4.51ZM8.5 8.5V11H11.153C11.34 10.235 11.459 9.392 11.491 8.5H8.5ZM5.145 12C5.283 12.386 5.44 12.744 5.613 13.068C6.165 14.103 6.831 14.718 7.5 14.923V12H5.145ZM5.327 14.472C5.10257 14.178 4.90289 13.866 4.73 13.539C4.47088 13.0463 4.25668 12.5312 4.09 12H2.255C3.02196 13.1004 4.08797 13.9582 5.327 14.472ZM3.82 11C3.63916 10.1781 3.53472 9.34117 3.508 8.5H1.018C1.08 9.39 1.309 10.233 1.674 11H3.82ZM10.673 14.472C11.912 13.9582 12.978 13.1004 13.745 12H11.91C11.7433 12.5312 11.5291 13.0463 11.27 13.539C11.0971 13.866 10.8975 14.178 10.673 14.472ZM8.5 12V14.923C9.17 14.719 9.835 14.103 10.387 13.068C10.56 12.744 10.717 12.386 10.855 12H8.5ZM12.18 11H14.326C14.691 10.233 14.92 9.39 14.982 8.5H12.492C12.4653 9.34117 12.3608 10.1781 12.18 11ZM14.982 7.5C14.9214 6.63301 14.6989 5.78506 14.326 5H12.18C12.354 5.782 12.462 6.623 12.492 7.5H14.982ZM11.27 2.461C11.517 2.925 11.732 3.441 11.91 4H13.745C12.978 2.89958 11.912 2.04178 10.673 1.528C10.891 1.812 11.091 2.126 11.27 2.461ZM10.855 4C10.7253 3.63305 10.5689 3.27609 10.387 2.932C9.835 1.897 9.17 1.282 8.5 1.077V4H10.855Z" fill="currentColor" />
                              </g>
                              <defs>
                                <clipPath id="clip0_8058_43498">
                                  <rect width="16" height="16" fill="white" />
                                </clipPath>
                              </defs>
                            </svg> */}
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M0 8C0 5.87827 0.842855 3.84344 2.34315 2.34315C3.84344 0.842855 5.87827 0 8 0C10.1217 0 12.1566 0.842855 13.6569 2.34315C15.1571 3.84344 16 5.87827 16 8C16 10.1217 15.1571 12.1566 13.6569 13.6569C12.1566 15.1571 10.1217 16 8 16C5.87827 16 3.84344 15.1571 2.34315 13.6569C0.842855 12.1566 0 10.1217 0 8ZM7.5 1.077C6.83 1.281 6.165 1.897 5.613 2.932C5.43113 3.2761 5.27471 3.63305 5.145 4H7.5V1.077ZM4.09 4C4.25667 3.46882 4.47087 2.95373 4.73 2.461C4.90291 2.13406 5.10259 1.82199 5.327 1.528C4.088 2.04183 3.02201 2.89962 2.255 4H4.09ZM3.508 7.5C3.538 6.623 3.646 5.782 3.82 5H1.674C1.30112 5.78505 1.07861 6.63301 1.018 7.5H3.508ZM4.847 5C4.65032 5.8198 4.53707 6.6574 4.509 7.5H7.5V5H4.847ZM8.5 5V7.5H11.49C11.4623 6.65743 11.3494 5.81983 11.153 5H8.5ZM4.51 8.5C4.53774 9.34257 4.65065 10.1802 4.847 11H7.5V8.5H4.51ZM8.5 8.5V11H11.153C11.34 10.235 11.459 9.392 11.491 8.5H8.5ZM5.145 12C5.283 12.386 5.44 12.744 5.613 13.068C6.165 14.103 6.831 14.718 7.5 14.923V12H5.145ZM5.327 14.472C5.10257 14.178 4.90289 13.866 4.73 13.539C4.47088 13.0463 4.25668 12.5312 4.09 12H2.255C3.02196 13.1004 4.08797 13.9582 5.327 14.472ZM3.82 11C3.63916 10.1781 3.53472 9.34117 3.508 8.5H1.018C1.08 9.39 1.309 10.233 1.674 11H3.82ZM10.673 14.472C11.912 13.9582 12.978 13.1004 13.745 12H11.91C11.7433 12.5312 11.5291 13.0463 11.27 13.539C11.0971 13.866 10.8975 14.178 10.673 14.472ZM8.5 12V14.923C9.17 14.719 9.835 14.103 10.387 13.068C10.56 12.744 10.717 12.386 10.855 12H8.5ZM12.18 11H14.326C14.691 10.233 14.92 9.39 14.982 8.5H12.492C12.4653 9.34117 12.3608 10.1781 12.18 11ZM14.982 7.5C14.9214 6.63301 14.6989 5.78506 14.326 5H12.18C12.354 5.782 12.462 6.623 12.492 7.5H14.982ZM11.27 2.461C11.517 2.925 11.732 3.441 11.91 4H13.745C12.978 2.89958 11.912 2.04178 10.673 1.528C10.891 1.812 11.091 2.126 11.27 2.461ZM10.855 4C10.7253 3.63305 10.5689 3.27609 10.387 2.932C9.835 1.897 9.17 1.282 8.5 1.077V4H10.855Z" fill="#888888" />
                            </svg>


                            <NavLink
                              to="" // 👈 not "#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (item?.owner === userProfile?._id) {
                                  // console.log("sdfas", item)
                                  history.push(`/app/${isChatbotPage ? `edit-chatbot/${item?._id}/?tab=leads` : "edit-bot/" + item?._id}`);
                                } else {
                                  e.preventDefault(); // 🚀 stop navigation
                                  // alert("Super Admin cannot access user/admin projects");
                                  toast({
                                    title: "Super Admin cannot access user/admin projects",
                                    status: "warning",
                                    isClosable: true,
                                  });
                                }
                              }}
                            // to="#"
                            // to={`/app/${isChatbotPage ? `edit-chatbot/${item?._id}/?tab=leads` : "edit-bot/" + item?._id}`}
                            >
                              {item["name"] || (item["name"] && item["name"] ? `${item["name"]} ${item["name"]}` : item["name"] || item["name"] || '-')}
                            </NavLink>
                          </Box>
                        </Td>
                        break
                      case 'isChatbotenabled':
                        // console.log(item, "aksdfjkajf", userProfile?._id)
                        return <Td key={keyIndex}>
                          <Switch size="lg"
                            disabled={!(item?.owner == userProfile?._id) || item?.isChatbotEnabled}
                            isChecked={item?.isChatbotEnabled || false}
                            onChange={(e) => {
                              // console.log(e, "<<<<<<");
                              actionHandler({ ...item, isChatBotEnabledStatus: !item?.isChatbotEnabled }, "statusUpdate")
                            }}
                            // onChange={(e) => setIsChatbotEnabled(e.target.checked)}
                            colorScheme="blue"
                          />
                        </Td>
                        break
                      case 'status':
                        const statusConfig: Record<StatusType, { colorScheme: string; label: string }> = {
                          CREATED: { colorScheme: 'gray', label: 'Created' },
                          CRAWLING: { colorScheme: 'blue', label: 'Crawling' },
                          CRAWLED: { colorScheme: 'cyan', label: 'Crawled' },
                          CRAWL_ERROR: { colorScheme: 'red', label: 'Crawl Error' },
                          GENERATING_EMBEDDINGS: { colorScheme: 'purple', label: 'Generating Embeddings' },
                          EMBEDDING_ERROR: { colorScheme: 'red', label: 'Embedding Error' },
                          READY: { colorScheme: 'green', label: 'Ready' },
                        };

                        const status = item[keyName] as StatusType;

                        const config = statusConfig[status] || {
                          colorScheme: 'gray',
                          label: status || 'N/A',
                        };

                        return (
                          <Td key={keyIndex}>
                            <Tooltip hasArrow fontSize="12px" textAlign={'center'} label={config.label !== "Ready" ? "Your project is not ready to use due to an error. Please crawl again to make it ready." : null}>
                              <Badge
                                colorScheme={config.colorScheme}
                                px="8px"
                                fontWeight={600}
                                borderRadius="500px"
                                textTransform="capitalize"
                                fontSize="14px"
                                cursor={config.label !== "Ready" ? "pointer" : "default"}
                              >
                                {config.label}
                              </Badge>
                            </Tooltip>
                          </Td>
                        );
                        break
                      case 'campaignDetails':
                        return <Td key={keyIndex} minW={"300px"}>
                          <Box display={'flex'}
                            // _hover={{
                            //   color: "#2977FF",
                            //   "& svg path": {
                            //     fill: "#2977FF",
                            //   },
                            // }}
                            alignItems={'center'} gap={'8px'}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9.828 4C9.03276 3.99956 8.27023 3.6834 7.708 3.121L6.878 2.293C6.691 2.10594 6.4375 2.00059 6.173 2H2.5C2.23804 1.99995 1.98653 2.1027 1.79953 2.28614C1.61253 2.46959 1.50498 2.71909 1.5 2.981L1.546 4H0.546L0.5 3C0.5 2.46957 0.710714 1.96086 1.08579 1.58579C1.46086 1.21071 1.96957 1 2.5 1H6.172C6.70239 1.00011 7.21101 1.2109 7.586 1.586L8.414 2.414C8.78899 2.7891 9.29761 2.99989 9.828 3V4Z" fill="#888888" />
                              <path fill-rule="evenodd" clip-rule="evenodd" d="M13.8097 4H2.18966C2.05075 3.99999 1.91335 4.02893 1.78624 4.08496C1.65913 4.14099 1.54509 4.22289 1.45138 4.32544C1.35767 4.42799 1.28636 4.54894 1.24199 4.68058C1.19762 4.81221 1.18116 4.95165 1.19366 5.09L1.83066 12.09C1.85311 12.3385 1.96763 12.5696 2.15172 12.7379C2.33581 12.9063 2.57619 12.9998 2.82566 13H13.1737C13.4231 12.9998 13.6635 12.9063 13.8476 12.7379C14.0317 12.5696 14.1462 12.3385 14.1687 12.09L14.8057 5.09C14.8182 4.95165 14.8017 4.81221 14.7573 4.68058C14.713 4.54894 14.6416 4.42799 14.5479 4.32544C14.4542 4.22289 14.3402 4.14099 14.2131 4.08496C14.086 4.02893 13.9486 3.99999 13.8097 4ZM2.18966 3C1.91174 2.99997 1.63686 3.05787 1.38257 3.16999C1.12827 3.28212 0.900129 3.44601 0.712702 3.65122C0.525276 3.85643 0.382675 4.09845 0.293997 4.36184C0.205318 4.62524 0.172509 4.90422 0.19766 5.181L0.83466 12.181C0.879816 12.6779 1.10909 13.14 1.47746 13.4766C1.84583 13.8131 2.3267 13.9998 2.82566 14H13.1737C13.6726 13.9998 14.1535 13.8131 14.5219 13.4766C14.8902 13.14 15.1195 12.6779 15.1647 12.181L15.8017 5.181C15.8268 4.90422 15.794 4.62524 15.7053 4.36184C15.6166 4.09845 15.474 3.85643 15.2866 3.65122C15.0992 3.44601 14.8711 3.28212 14.6168 3.16999C14.3625 3.05787 14.0876 2.99997 13.8097 3H2.18966Z" fill="#888888" />
                            </svg>

                            {item?.campaignDetails?.campaignName || "N/A"}
                          </Box>
                        </Td>
                        break
                      case 'updatedAt':
                        return <Td key={keyIndex}>{format(new Date(item[keyName] || item?.createdAt), 'dd/MM/yyyy, hh:mm a')}</Td>
                        break
                      case 'lastcrawled':
                        return <Td key={keyIndex}>
                          <LastCrawledFormate date={item?.lastCrawlAt || item?.updatedAt} />
                        </Td>
                        break
                      case 'isSyncedToCrm':
                        return <Td key={keyIndex} textAlign={'center'}>{item[keyName] ? <Image margin={'auto'} src={YesIcon} alt='Yes' /> : <Image margin={'auto'} src={NoIcon} alt='No' />}</Td>
                        break
                      case 'usage':
                        return <Td key={keyIndex} textAlign={'start'}>
                          {
                            item?.monthUsage?.count === undefined ? 0 : formatNumber(item?.monthUsage?.count)
                          }
                        </Td>
                        break
                      case 'IsLeadType':
                        return <Td key={keyIndex} minWidth={"150px"}>
                          {item[keyName] ? (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                minWidth: '110px'
                              }}

                              color={
                                item[keyName] === 'chatBot' ? '#007aff' :
                                  item[keyName] === 'mailBot' ? 'rgb(98, 0, 238)' :
                                    item[keyName] === 'emailOutreach' ? '#CB30E0' :
                                      item[keyName] === 'zapierCrm' ? 'rgb(255, 74, 0)' :
                                        item[keyName] === 'voiceBot' ? '#ff9500' : 'rgb(98, 0, 238)'
                              }
                              // px="10px"
                              // py="4px"
                              borderRadius="8px"
                              textTransform="capitalize"
                            >
                              {
                                item[keyName] === 'emailOutreach' ?
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.9414 14.4834C15.7251 15.3542 14.9377 15.999 14 15.999H2C1.06227 15.999 0.274943 15.3542 0.0585938 14.4834L8 10.0713L15.9414 14.4834ZM5.69336 10.209L0 13.3721V6.87207L5.69336 10.209ZM16 13.3721L10.3066 10.209L16 6.87207V13.3721ZM11.5 0C12.3284 0 13 0.671573 13 1.5V7.5L9.5 9.5L8 8.75L6.5 9.5L3 7.5V1.5C3 0.671573 3.67157 6.4426e-08 4.5 0H11.5ZM2 6.88477L0 5.71289V5.39941C0.00019719 4.66107 0.407127 3.9823 1.05859 3.63477L2 3.13281V6.88477ZM14.9414 3.63477C15.5929 3.9823 15.9998 4.66106 16 5.39941V5.71289L14 6.88477V3.13281L14.9414 3.63477Z" fill="#CB30E0" />
                                  </svg> :
                                  item[keyName] === 'emailAssistant' ?
                                    <img src={`/icons/ic-${"mailbot"}.svg`} alt='icon' />
                                    :
                                    <img src={`/icons/ic-${item[keyName]?.toLowerCase()}.svg`} alt='icon' />
                              }
                              {
                                item[keyName] === 'emailOutreach' || item[keyName] === 'emailAssistant' ? item[keyName]?.replace(/([a-z])([A-Z])/g, '$1 $2') :
                                  item[keyName]
                                    ? item[keyName]
                                      .charAt(0).toUpperCase() +
                                    item[keyName]
                                      .slice(1)
                                      .replace(/bot/gi, "Bot")
                                    : "-"
                              }

                            </Box>
                          ) : '-'}
                        </Td>
                        break
                      case 'customQuestions':
                        // console.log("leadActions", item?.customQuestions)
                        return <Td key={keyIndex}>
                          <Flex gap="12px">
                            {
                              item?.customQuestions?.length > 0 ?
                                <Tooltip label={"View All Ques / Ans"} fontSize={'10px'}>
                                  <Button
                                    sx={{
                                      textTransform: "capitalize",
                                      ":hover": {
                                        color: "black"
                                      },
                                      "_focus": {
                                        outline: "none",
                                      }
                                    }}
                                    onClick={() => setSelectedLead({ ...item, action: "questionView" })}
                                    size="sm"
                                  >
                                    <Image src={`/icons/eye.svg`} alt='icon' />
                                  </Button>
                                </Tooltip> : "NA"
                            }
                          </Flex>
                        </Td>
                        break
                      case 'leadActions':
                        // console.log("leadActions", item)
                        return <Td key={keyIndex}>
                          <Flex gap="12px" justifyContent={'flex-end'}>
                            <Tooltip label={item?.IsLeadType == "voiceBot" ? "Play Recording" : "View Summary"} fontSize={'10px'}>
                              <Button
                                sx={{
                                  _focus: {
                                    outline: "none"
                                  }
                                }}
                                p="4px 8px"
                                size="sm"
                                onClick={() => {
                                  handleLeadsAction(item, "view")
                                }}
                              >
                                {
                                  item?.IsLeadType == "voiceBot" ? <>
                                    {/* <Image src={`/icons/pause.svg`} alt='icon' /> */}
                                    <Image height="16px" width="16px" src={`/icons/ic-play.svg`} alt='icon' />
                                  </> :
                                    <Image height="16px" width="16px" src={`/icons/ic-page_summary.svg`} alt='icon' />
                                }
                              </Button>
                            </Tooltip>
                          </Flex>
                        </Td>
                        break
                      case 'actions':
                        return <Td key={keyIndex}>
                          <Flex gap="8px" justifyContent={"end"}>
                            {
                              actions?.map((actionName: any, index: any) => {
                                return (
                                  <Tooltip textTransform={"capitalize"} label={actionName == "getcode" ? "Add chatbot to the Site" : actionName} fontSize={'10px'}>
                                    <Button
                                      colorScheme={actionName === 'delete' ? "red" : "gray"}
                                      padding={"4px 8px"}
                                      sx={{
                                        textTransform: "capitalize",
                                        ":hover": {
                                          color: "black"
                                        },
                                        "_focus": {
                                          outline: "none",
                                        }
                                      }}
                                      // backgroundColor={actionName === 'delete' ? 'red' : ''}
                                      onClick={() => actionHandler(item, actionName)}
                                      size="sm"
                                    >
                                      <Image src={`/icons/${actionName}.svg`} alt='icon' />
                                    </Button>
                                  </Tooltip>
                                )
                              })
                            }
                          </Flex>
                        </Td>
                        break
                      default:
                        // console.log(item[keyName])
                        return <Td key={keyIndex} minWidth={"250px"}>
                          {(keyName == "email" || keyName == "phone") && item[keyName] ?
                            <Box display={'flex'} textTransform={'lowercase'} alignItems={'center'} gap={'4px'}>

                              <Image src={`/icons/ic-${keyName}.svg`} alt='icon' />
                              {item[keyName] || "-"}
                            </Box> :
                            <Box display={'flex'} textTransform={'lowercase'} alignItems={'center'} gap={'4px'}>
                              {keyName == "campaignName" &&
                                <Image src={`/icons/file-icon.svg`} alt='icon' />
                              }
                              {item[keyName] || "-"}
                            </Box>
                          }
                        </Td>

                    }
                  })
                }
              </Tr>
            ))
          ) : (
            <Tr>
              <Td colSpan={tableHeader?.length + 1 || 8} textAlign="center">
                {
                  noDataText ? noDataText : "No data found"
                }
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </TableContainer >
  )
}

export default TableComponent
