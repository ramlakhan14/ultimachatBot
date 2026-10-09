import * as React from "react";
import {
	Box,
	Button,
	Flex,
	Heading,
	SimpleGrid,
	Spinner,
	Tooltip,
	HStack,
	Link as ChakraLink,
	useToast,
	VStack,
	Text,
	Center, InputGroup, InputLeftElement, Input,
	AlertDialog,
	AlertDialogBody,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogContent,
	AlertDialogOverlay,
	Select,
	Image
} from "@chakra-ui/react";
import { Link, Redirect, useHistory } from "react-router-dom";
import { useEffect } from "react";
import { User } from '../../services/appConfig';
import { CurrentUser } from "../../services/appConfig";
import { NoDataSubscribeIcon } from "../../components/Icons/noData/NoDataSubscribeIcon";
import { NoDataProjectIcon } from "../../components/Icons/noData/NoDataProjectIcon";
import { checkCanCreateChatbot, deleteKnowledgebase, fetchKnowledgebases, generateEmbeddings, updateEnabledStatus } from "../../services/knowledgebaseService";
import { SELF_HOST } from "../../config";
import { EmailPlusIcon } from "../../components/Icons/Icon";
import styles from "./ChatbotList.module.scss";
import TableComponent from "../TableComponent";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { IoIosSearch } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { getProfileRequest } from "../../redux/actions/globalActions";
let PAID_ONLY = false;

if (SELF_HOST === 'true') {
	PAID_ONLY = false;
}

export const ChatbotList = ({ setProjectCount }: any) => {
	const toast = useToast();
	const [chatbotsList, setChatBotList] = React.useState<any>([]);
	const [chatbotsLoaded, setChatbotsLoaded] = React.useState<boolean>(true);
	const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);
	const [currentPage, setCurrentPage] = React.useState<number>(1);
	const [totalPages, setTotalPages] = React.useState<number>(1);
	const [totalItems, setTotalItems] = React.useState<any>(null);
	const [totalAdminItems, settotalAdminItems] = React.useState<any>(null);
	const [totalsScrapedLeadProject, settotalsScrapedLeadProject] = React.useState<any>(null);
	const history = useHistory();

	const [createChatBotLoading, setCreateChatBotLoading] = React.useState<any>({});
	const [itemsPerPage, setItemsPerPage] = React.useState<number>(10);
	const [forcePage, setForcePage] = React.useState<number>(0);
	const [isAdminList, setIsAdminList] = React.useState<boolean>(false);
	const [searchQuery, setSearchQuery] = React.useState<string>("");
	const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState<string>("");
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState<any>();
	// const cancelRef = useRef();
	const cancelRef = React.useRef<HTMLButtonElement>(null)
	const [user, setUser] = React.useState<User>(CurrentUser.get());
	const userProfile = useSelector((state: any) => state.user?.profile) || {}
	// const [userData, setUserData] = React.useState<User | null>(null);
	let checkUserEligibility = ((!userProfile?.openaiKeys?.apiKey) && (!userProfile?.openaiKeys?.useOwnKey) && userProfile?.role == "user")
	const dispatch = useDispatch()
	// console.log("userProfile", userProfile);

	React.useEffect(() => {

		if (checkUserEligibility) {
			history.push("/app/myprofile")
		}
	}, [userProfile?._id, checkUserEligibility])




	// Search debounce effect
	React.useEffect(() => {
		const timerId = setTimeout(() => {
			setCurrentPage(1);
			setForcePage(0);
			setDebouncedSearchQuery(searchQuery);
		}, 500); // 500ms debounce

		return () => {
			clearTimeout(timerId);
		};
	}, [searchQuery]);
	React.useEffect(() => {
		async function fetchData() {
			try {
				const userData = CurrentUser.get();
				setUser(userData);
			} catch (error) {
				// Error handling
			} finally {
				// Cleanup
			}
		}
		fetchData();
	}, [])
	// React.useEffect(() => {
	// 	setCurrentPage(1);
	// 	setForcePage(0);
	// }, [debouncedSearchQuery]);

	const onMenuItemClick = React.useCallback(
		async (type, chatbot) => {
			if (type === "edit") {
				history.push(`/app/edit-bot/${chatbot._id}/?tab=scrape-website-data`);
			} else if (type === "getcode") {
				history.push(`/app/edit-chatbot/${chatbot._id}/?tab=add-to-site`);
			} else if (type === "customize") {
				history.push(`/app/edit-chatbot/${chatbot._id}/?tab=settings`);
			} else if (type === "delete") {
				await deleteKnowledgebase(chatbot._id as string);
				// setChatBotList(chatbotsList?.filter((_chatbot: any) => _chatbot._id !== chatbot._id));
				// fetchChatbots(currentPage, itemsPerPage);
				if (chatbotsList?.length === 1 && currentPage > 1) {
					fetchChatbots(currentPage - 1, itemsPerPage);
					setCurrentPage(currentPage - 1)
				} else {
					fetchChatbots(currentPage, itemsPerPage);
					setCurrentPage(currentPage)
				}
				toast({
					title: `Project has been deleted successfully `,
					status: "success",
					isClosable: true,
				});
				history.push(`/app/bots`)
			}
		},
		[history, chatbotsList, toast]
	);
	const role = CurrentUser.get().role;
	const [canCreateChatbot, setCanCreateChatbot] = React.useState<boolean>(false);

	const checkCanCreateChatbotData = React.useCallback(async () => {
		try {
			const response: any = await checkCanCreateChatbot()
			// console.log(response, "<<<<<<SAdf");
			setCanCreateChatbot(response?.data?.data?.allowed || false);
		} catch (error) {
			// console.log("res", error);
		}
	}, [user]);

	useEffect(() => {
		checkCanCreateChatbotData();
	}, []);

	const [isScrapedLeadProject, setisScrapedLeadProject] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState("projects");
	// useEffect(() => {
	// 	setSearchQuery("");
	// 	setDebouncedSearchQuery("");
	// }, [activeTab]);

	const fetchChatbots = React.useCallback(async (page, limit, isAdmin = false) => {
		// console.log("clicked", isScrapedLeadProject);
		try {
			setChatbotsLoaded(true);
			const response = await fetchKnowledgebases(page || 1, limit || 10, isAdminList, debouncedSearchQuery, false, isScrapedLeadProject);
			setChatbotsLoaded(false);
			setChatBotList(response.data.data);
			setCurrentPage(response.data.pagination.currentPage);
			setTotalPages(response.data.pagination.totalPages);
			setTotalItems(response.data.pagination.totalItems);
			settotalAdminItems(response.data.pagination.totalAdminItems);
			settotalsScrapedLeadProject(response.data.pagination.totalsScrapedLeadProject);
			setIsLoadingMore(false);
			setProjectCount(response?.data?.data);
		} catch (error) {
			setIsLoadingMore(false);
			setChatbotsLoaded(false);
			// Error handling
		}
	}, [currentPage, itemsPerPage, isAdminList, debouncedSearchQuery, isScrapedLeadProject, activeTab]);

	const loadMore = React.useCallback(() => {
		if (currentPage < totalPages) {
			fetchChatbots(currentPage + 1, true);
		}
	}, [currentPage, totalPages, fetchChatbots]);

	useEffect(() => {
		if (!!role) {
			fetchChatbots(currentPage, itemsPerPage);
		}
	}, [fetchChatbots, role, isAdminList]);

	const getNoDataIcon = React.useCallback(() => {
		if (user && PAID_ONLY) {
			// if (user && PAID_ONLY && user?.subscriptionData?.name === 'FREE') {
			return <VStack
				alignItems="center"
				direction="column"
				justifyContent="center"
				w="100%"
				h="calc(100vh - 150px)"
			// spacing="9"
			>
				<img src="/icons/upgrade-plan-icon.svg" alt="upgrade plan" />
				<Box textAlign="center">
					<Heading
						maxW="580px"
						fontSize={"14px"}
						fontWeight="400"
						as="p"
						color="#6C757D"
						lineHeight="medium"
						textAlign="center"
						mb={"16px"}
					>
						Upgrade to a paid plan or purchase credits to create ChatBots.
					</Heading>
					<HStack justify="center">
						<Link to="/app/settings/subscription">
							<Button colorScheme="blue" fontWeight={500}
								className="btn-hover-pri" size='md'>Subscribe Now</Button>
						</Link>
						<ChakraLink href={'https://ultimabot.lemonsqueezy.com/buy/881a9491-5b7b-44e2-acdf-cdf2521fb1f4?embed=1&checkout[email]=' + user.email}
							isExternal >
							<Button variant='outline' borderColor={'#2977ff'} color={'#2977ff'} fontWeight={500} colorScheme='blue' size='md'>Buy 50K tokens for $5</Button>
						</ChakraLink>
					</HStack>
				</Box>
			</VStack>
		}
		return (
			<VStack
				alignItems="center"
				direction="column"
				justifyContent="center"
				w="100%"
				h="calc(100vh - 150px)"
			// spacing="9"
			>
				<NoDataProjectIcon width="auto" height="250px" />
				<Box textAlign="center" mt="24px !important">
					<Heading
						maxW="580px"
						fontSize={"18px"}
						fontWeight="700"
						as="h3"
						color="#1A202C"
						lineHeight="medium"
						textAlign="center"
						mb={"8px"}
					>
						No project found
					</Heading>
					<Heading
						maxW="580px"
						fontSize={"14px"}
						fontWeight="400"
						as="p"
						color="#6C757D"
						lineHeight="medium"
						textAlign="center"
					>
						Create an AI-powered ChatBot trained on your website content in minutes.
					</Heading>
				</Box>
			</VStack>
		);
	}, [user]);


	const createChatBot = React.useCallback(async (id) => {
		try {
			setCreateChatBotLoading({
				[id]: true
			});
			await generateEmbeddings(id);
			setCreateChatBotLoading({
				[id]: false
			})
		} catch (error) { }
	}, []);


	const tableHeader = [
		'Site',
		'Usages',
		'ChatBot Enabled',
		'Status',
		'Last Crawled',
		...(isAdminList ? ['Actions'] : role == "user" ? ['Actions'] : []),
	]
	const tableDataKeys = [
		'porjectName',
		`usage`,
		`isChatbotenabled`,
		`status`,
		'lastcrawled',
		...(isAdminList ? ['actions'] : role == "user" ? ['actions'] : []),
	]


	const handleDelete = (item: any,) => {
		setIsDeleteDialogOpen(item);
	};

	const handleConfirmDelete = (item: any) => {
		setIsDeleteDialogOpen({});
		onSelect("delete", item);
	};

	const handleCancelDelete = () => {
		setIsDeleteDialogOpen(false);
	};

	const onSelect = React.useCallback((type, item) => {
		onMenuItemClick && onMenuItemClick(type, item)
	}, [onMenuItemClick]);




	const getChatbotsList = React.useCallback(() => {
		if (!chatbotsLoaded && !chatbotsList?.length && !searchQuery) {
			return getNoDataIcon();
		}
		// console.log("chatbotsList", chatbotsLoaded);
		return (
			<TableComponent
				height="calc(100vh - 230px)"
				isLoading={chatbotsLoaded}
				data={chatbotsList || []}
				tableDataKeys={tableDataKeys}
				tableHeader={tableHeader}
				totalItems={totalItems}
				itemsPerPage={itemsPerPage}
				currentPage={currentPage}
				actions={['edit', 'delete']}
				actionHandler={(item: any, type: string) => {
					// console.log("item", item, type);
					if (type === 'delete') {
						handleDelete(item);
					} else if (type === 'edit') {
						onSelect('edit', item)
					} else if (type === 'statusUpdate') {
						// console.log(" run", "statusUpdate");
						handleStatusUpdate(item)
					} else if (type === 'customize') {
						onSelect('customize', item)
					} else if (type === 'getcode') {
						onSelect('getcode', item)
					}
				}}
			/>
		)
	}, [createChatBot, createChatBotLoading, chatbotsList, chatbotsLoaded, getNoDataIcon, onMenuItemClick, currentPage, totalPages, loadMore, isLoadingMore]);

	const [handleStatusUpdateLoading, setHandleStatusUpdateLoading] = React.useState<any>(false);
	const handleStatusUpdate = React.useCallback(async (item: any) => {
		try {
			setHandleStatusUpdateLoading(true)
			if (handleStatusUpdateLoading) return;
			const response: any = await updateEnabledStatus(item._id, item.isChatBotEnabledStatus);
			// console.log("clickec item s", response);
			setHandleStatusUpdateLoading(false)
			fetchChatbots(currentPage, itemsPerPage);
			toast({
				title: `Bot status has been updated successfully `,
				status: "success",
				isClosable: true,
			});

		}
		catch (error: any) {
			setHandleStatusUpdateLoading(false)
			toast({
				title: error?.response?.data?.message || error?.message || "Server Error",
				status: "error",
				isClosable: true,
			});

		}
	}, []);

	const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setItemsPerPage(parseInt(event.target.value, 10));
		setCurrentPage(1);
		setForcePage(0);
	};

	const handlePageChange = React.useCallback((page) => {
		setCurrentPage(page + 1);
		setForcePage(page);
	}, []);

	const handleCreateClick = () => {
		const handleClick = () => {
			if (!canCreateChatbot) {
				toast({
					title: "Bot limit reached",
					description:
						"You’ve reached your bot limit. Please upgrade your plan to create more chatbots.",
					status: "warning",
					duration: 4000,
					isClosable: true,
				});
				return;
			} else {
				history.push("/app/create-bot");
			}
		}

		return (
			<Button
				colorScheme="blue"
				className="btn-hover-pri"
				size="md"
				leftIcon={<Image src="/icons/ic-projects.svg" />}
				onClick={handleClick}
				fontWeight={"500"}
			>
				Create New
			</Button>
		);
	};
	return (
		<React.Fragment>
			<Box
				w="100%"
				maxW="100%"
				p="6"
				shadow="sm"
				h="100%"
				position="relative"
				overflow="auto"
				overflowX="hidden"
			>
				<VStack w="100%" spacing="2">
					<Flex shrink={0} w="100%" justifyContent="space-between">
						<Flex alignItems="center" gap={"12px"}>
							<Heading fontSize="24">Projects</Heading>
							<Box cursor={role == 'admin' ? "pointer" : ""}
								// padding={"2px 10px!important"}
								fontWeight={500}
								onClick={() => {
									setCurrentPage(1)
									setSearchQuery("");
									setDebouncedSearchQuery("");
									setIsAdminList(false)
									setisScrapedLeadProject(false)
									setActiveTab("projects");

								}} >
								{<Text as="span"
									border={!(activeTab === "projects") ? "1px solid #2977FF" : ""}
									color={!(activeTab === "projects") ? "#2977FF" : ""}
									background={!(activeTab === "projects") ? "#fff" : ""}

									className={styles.projectCount}>{totalItems || "0"} Projects</Text>}
							</Box>
							{
								role == 'admin' &&
								<Box
									className={styles.projectCount}
									cursor={"pointer"}
									border={!(activeTab === "admin") ? "1px solid #2977FF" : ""}
									color={!(activeTab === "admin") ? "#2977FF" : ""}
									background={!(activeTab === "admin") ? "#fff" : ""}
									padding={"2px 10px!important"}
									onClick={() => {
										setCurrentPage(1)
										setIsAdminList(true)
										setSearchQuery("");
										setDebouncedSearchQuery("");
										setisScrapedLeadProject(false)
										setActiveTab("admin");
									}}
								>
									{totalAdminItems || "0"}	Your Projects
								</Box>
							}
							{
								role == 'admin' &&
								<Box
									className={styles.projectCount}
									cursor={"pointer"}
									// border={!isScrapedLeadProject ? "1px solid #2977FF" : ""}
									// color={!isScrapedLeadProject ? "#2977FF" : ""}
									// background={!isScrapedLeadProject ? "#fff" : ""}

									border={!(activeTab === "scraped") ? "1px solid #2977FF" : ""}
									color={!(activeTab === "scraped") ? "#2977FF" : ""}
									background={!(activeTab === "scraped") ? "#fff" : ""}
									padding={"2px 10px!important"}
									onClick={() => {
										setCurrentPage(1)
										setIsAdminList(false)
										setSearchQuery("");
										setDebouncedSearchQuery("");
										setisScrapedLeadProject(true)
										setActiveTab("scraped");
									}}
								>
									{totalsScrapedLeadProject
										|| "0"}	Scraped Lead Projects
								</Box>
							}
						</Flex>

						<Flex gap="12px">
							{
								// searchQuery && totalItems != "0" &&
								<InputGroup
									width="190px"
									outline={"none"}
									borderRadius="4px"
									background={"white"}
								>
									<InputLeftElement pointerEvents='none'>
										<IoIosSearch color="#6C757D" />
									</InputLeftElement>
									<Input
										type='text'
										placeholder='Search'
										color="#6C757D"
										border="1px solid #6C757D"
										value={searchQuery}
										onChange={(event) => {
											setSearchQuery(event.target.value);
										}}
										fontWeight={"400"}
										padding={"0 0 0 36px"}
									/>
								</InputGroup>
							}
							{handleCreateClick()}
						</Flex>

					</Flex>
					<Box minW="100%" w="600px" style={{ marginTop: "0" }}>
						{getChatbotsList()}
					</Box>
					{
						totalItems > 10 &&
						<HStack w="full" justifyContent="space-between" py={2} mb={2}>
							<Flex alignItems="center">
								<Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total {activeTab == "projects" ? totalItems : activeTab == "admin" ? totalAdminItems : totalsScrapedLeadProject} items</Text>
								<PaginatorTwo
									onPageChange={handlePageChange}
									pageRangeDisplayed={5}
									pageCount={totalPages}
									forcePage={forcePage}
								/>
							</Flex>
							<Flex alignItems="center">
								<Select
									value={itemsPerPage}
									bg="white"
									onChange={handleItemsPerPageChange}
									width="auto"
									color="#6C757D"
								>
									{/* <option value={3}>3 / page</option> */}
									<option value={10}>10 / page</option>
									<option value={20}>20 / page</option>
									<option value={50}>50 / page</option>
								</Select>
							</Flex>
						</HStack>
					}
				</VStack>
			</Box>
			<AlertDialog
				isOpen={isDeleteDialogOpen?._id}
				leastDestructiveRef={cancelRef}
				onClose={handleCancelDelete}
			>
				<AlertDialogOverlay>
					<AlertDialogContent>
						<AlertDialogHeader fontSize="lg" fontWeight="bold">
							Delete {isDeleteDialogOpen?.name || "chatbot"} ?

						</AlertDialogHeader>
						<AlertDialogBody>
							{/* You can't undo this action afterwards. */}
							Are you sure you want to delete this project? This action is irreversible and will permanently remove all associated data, including knowledge base records, leads, campaigns, and embedding chunks.

						</AlertDialogBody>
						<AlertDialogFooter>
							<Button ref={cancelRef} fontWeight={"500"} size='sm' onClick={handleCancelDelete}>
								Cancel
							</Button>
							<Button
								size="sm"
								fontWeight={"500"}
								colorScheme="red"
								variant="solid" onClick={() => handleConfirmDelete(isDeleteDialogOpen)} ml={3}>
								Delete
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialogOverlay>
			</AlertDialog>
		</React.Fragment>
	);
};