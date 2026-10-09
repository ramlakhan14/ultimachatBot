import * as React from "react";
import {
	Box,
	Flex,
	Heading,
	Text,
	HStack,
	List,
	ListItem,
	VStack,
	Spinner,
	IconButton,
	useToast,
	Alert,
	AlertIcon,
	Button,
	useDisclosure,
	AlertDescription,
	AlertTitle,
	AlertDialog,
	AlertDialogBody,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogContent,
	AlertDialogOverlay,
	TabPanel,
	Tabs,
	TabList,
	Tab,
	TabPanels,
	InputGroup,
	InputLeftElement,
	Input,
	TabIndicator,
	Stack,
	Popover,
	PopoverTrigger,
	PopoverContent,
	PopoverArrow,
	Tooltip
} from "@chakra-ui/react";


import { useEffect, useRef } from "react";
import {
	Link,
	RouteComponentProps,
	useHistory,
	withRouter,
} from "react-router-dom";

import { NoDataFineTuneIcon } from "../../components/Icons/noData/NoDataFineTuneIcon";

import { RiDeleteBin5Line } from "react-icons/ri"

import classNames from "classnames";

import {
	ChatBotProductSetup,
} from "../ChatBotProductSetup/ChatBotProductSetup";
import { ChatBotsCustomize } from "../ChatBotsCustomize/ChatBotsCustomize";
import { useLocation } from "react-router-dom";

import styles from "./EditChatbot.module.scss";
import { fetchKnowledgebaseCrawlData, customizeWidget, deleteTrainingData, fetcKnowledgebase, fetchKnowledgebaseDetails, generateEmbeddings, getTrainingData, getTrainingDataDetails, updateWebsiteData, getChatSessions, getOfflineMessages, updatePrompt, updateDefaultAnswer, fetchKnowledgebaseCrawlDataForDocs, addTrainingDoc, updateAdminEmail, getChatSessionDetails, unReadChatSession, readChatSession, deleteChatSession, updateModelName, deleteKnowledgebase, leadsData, getUrlKbId } from "../../services/knowledgebaseService";
import { ChatBot } from "../../components/ChatBot/ChatBot";
import { chatWidgetDefaultValues, chatWidgetDefaultValuesForVakmangids } from "../../utils/commonUtils";
import { AddTrainingData } from "../AddTrainingData/AddTrainingData";
import { AddTrainingDataForm } from "../AddTrainingDataForm/AddTrainingDataForm";
import { SectionTitle } from "../../components/SectionTitle/SectionTitle";
import { CurrentUser, User } from "../../services/appConfig";
import { ChatBotCustomizeData, TrainingData, OfflineMessagePagination, ChatSessionPagination, CustomDataPagination, ProductSetupData, DocsKnowledgeData, ChatSession, ChatSessionDetail, leads, leadsPagination } from "../../types/knowledgebase.type";
import { OfflineMessagesNew } from "../OfflineMessages/OfflineMessagesNew";
import { ChatSessionsNew } from "../ChatSessions/ChatSessionsNew";
import { Paginator } from "../../widgets/Paginator/Paginator";
import { CustomDomain } from "../CustomDomain/CustomDomain";
import LastCrawledFormate from "../../utils/LastCrawledFormate";
import { IoIosSearch } from "react-icons/io";
import { LeadsNew } from "../Leads/LeadsNew";
import { EmailTemplates } from "../EmailTemplates/EmailTemplates";
import CustomPrompt from "../customPrompt/CustomPrompt";
import KnowledgeBase from "../customPrompt/KnowledgeBase";
import { GoInfo } from "react-icons/go";
import { useSelector } from "react-redux";
export function validateEmailAddress(email: string) {
	return email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}

type Steps =
	| "scrape-website-data"
	| "leads"
	| "chat-sessions"
	| "offline-messages"
	| "product-setup"
	| "customize"
	| "custom-prompt"
	| "add-to-site"
	| "train-custom-data"
	| "custom-prompt"
	| "chatbot"
	| "documents"
	| "settings"
	| "custom-domain";



interface MatchParams {
	chatbotId: string;
}


export type EditChatbotProps = RouteComponentProps<MatchParams>;

const VekmangidsChatbot = (props: EditChatbotProps) => {
	const toast = useToast();
	let history = useHistory();
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const tab = queryParams.get('tab');
	let { search } = useLocation();
	const [isFetchingKBId, setIsFetchingKBId] = React.useState<boolean>(false);
	const [vakmangidsChatbotDefaultData, setVakmangidsChatbotDefaultData] = React.useState<any>({});

	const urlInputRef = useRef<HTMLInputElement>(null);


	const handleDefaultValueSave = async (chatWidgetData?: ChatBotCustomizeData) => {
		try {
			const response = await customizeWidget(chatBot._id, chatWidgetData || vakmangidsChatbotDefaultData as ChatBotCustomizeData);
			console.log(response);
		} catch (error: any) {
			toast({
				title: error?.response?.data?.message,
				status: "error",
				duration: 5000,
				isClosable: true,
			})
		}
	}



	const handleUrlButtonClick = async () => {
		try {
			setIsFetchingKBId(true);
			const crawlRespone = await getUrlKbId(urlInputRef.current!.value);
			if (crawlRespone?.status === 201) {
				handleDefaultValueSave()
				history.push(`/app/vakmangids-chatbot/${crawlRespone?.data}/?tab=scrape-website-data`);
			}
		} catch (error: any) {
			toast({
				title: error?.response?.data?.message,
				status: "error",
				duration: 5000,
				isClosable: true,
			})
		} finally {
			setIsFetchingKBId(false);
		}

	};

	useEffect(() => {
		if (
			tab === 'scrape-website-data' ||
			tab === 'leads' ||
			tab === 'chat-sessions' ||
			tab === 'offline-messages' ||
			tab === 'product-setup' ||
			tab === 'train-custom-data' ||
			tab === 'custom-prompt' ||
			tab === 'add-to-site' ||
			tab === 'chatbot' ||
			tab === 'documents' ||
			tab === 'settings') {
			setCurrentStep(tab);
		} else {
			setCurrentStep('product-setup');
		}
	}, [tab]);



	const defaultStep = new URLSearchParams(search).get("step") as Steps;

	const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
	const [isUploadingDocs, setIsUploadingDocs] = React.useState<boolean>(false);
	const [questionsToDelete, setQuestionsToDelete] = React.useState<string>('0');
	const [chatBot, setChatbot] = React.useState({} as any);
	const [defaultCrauledData, setDefaultCrauledData] = React.useState<any>();
	const [count, setCount] = React.useState<number>(1);

	const [currentStep, setCurrentStep] = React.useState<Steps>(
		defaultStep || "scrape-website-data"
	);

	const [primaryButtonLabel, setPrimaryButtonLabel] = React.useState<string>("Crawl Again & Save");
	const [productSetupTab, setProductSetupTab] = React.useState<number>(0);

	const handleTabChange = React.useCallback((tabIndex: number) => {
		if (tabIndex === 0) {
			setPrimaryButtonLabel("Crawl Again & Save");
			setProductSetupTab(0);
		} else {
			setPrimaryButtonLabel("Upload Files");
			setProductSetupTab(1);
		}
	}, []);


	const { onOpen: onDeleteDialogOpen, onClose: onDeleteDialogClose } = useDisclosure();
	const userProfile = useSelector((state: any) => state.user?.profile) || {}

	// const cancelRef = React.useRef()
	const cancelRef = React.useRef<HTMLButtonElement>(null)

	const [isChatLoading, setIsChatLoading] = React.useState<boolean>(false);

	const [crawlDataLoading, setIrawlDataLoading] = React.useState<boolean>(false);

	const [docsDataLoading, setDocsDataLoading] = React.useState<boolean>(false);
	const [docsData, setDocsData] = React.useState<DocsKnowledgeData>();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
	const [isDeleteDialogOpens, setIsDeleteDialogOpens] = React.useState(false);

	const getCrawlDataPagination = React.useCallback(async (pageNo: number) => {
		try {
			setIrawlDataLoading(true);
			const _crawlDataResponse = await fetchKnowledgebaseCrawlData(defaultCrauledData.knowledgebaseId, pageNo);
			const _data = {
				stats: defaultCrauledData?.stats,
				urls: _crawlDataResponse.data.results,
				pages: _crawlDataResponse.data.pages,
				knowledgebaseId: defaultCrauledData.knowledgebaseId
			}

			setDefaultCrauledData(_data)
		} catch (error) {

		} finally {
			setIrawlDataLoading(false);
		}
	}, [defaultCrauledData]);


	React.useEffect(() => {
		const steps = [
			"scrape-website-data",
			"leads",
			'chat-sessions',
			'offline-messages',
			'custom-prompt',
			'customize',
			'add-to-site',
			'chatbot',
			"settings",
			'custom-domain'
		];
		const index = steps.indexOf(currentStep);
		if (index !== -1) {

			document.getElementById(`tab-${index}`)?.scrollIntoView({ behavior: 'smooth' });
		}
	}, [currentStep]);

	const getDocsDataPagination = React.useCallback(async (pageNo: number) => {
		try {
			setDocsDataLoading(true);
			const _docsDataResponse = await fetchKnowledgebaseCrawlDataForDocs(defaultCrauledData.knowledgebaseId, pageNo);

			const _data: DocsKnowledgeData = {
				docs: _docsDataResponse.data.results,
				pages: _docsDataResponse.data.pages,
				knowledgebaseId: defaultCrauledData.knowledgebaseId
			}
			setDocsData(_data)
		} catch (error) {

		} finally {
			setDocsDataLoading(false);
		}
	}, [defaultCrauledData]);

	const [productSetupLoadingText, setProductSetupLoadingText] = React.useState("Setting up your product");

	const startEmbeding = React.useCallback((chatBotId) => {
		let interval = setInterval(async () => {
			const details = await fetchKnowledgebaseDetails(chatBotId);
			// console.log("details", details?.data);

			if (details.data.status === 'CRAWLED' || (details.data.websiteData === null && details.data.status === 'CREATED')) {
				await generateEmbeddings(chatBotId);
			} else if (details.data.status === 'CRAWL_ERROR' || details.data.status === 'EMBEDDING_ERROR') {
				clearInterval(interval);
				setIsSubmitting(false);
				toast({
					title: `Oops! Something went wrong`,
					status: "error",
					isClosable: true,
				});
			} else if (details.data.status === 'GENERATING_EMBEDDINGS') {
				setProductSetupLoadingText('Training UltimaBot with your website data... This may take some time based on the amount of the data...');
			} else if (details.data.status === 'READY') {
				clearInterval(interval);

				const _crawlDataResponse = await fetchKnowledgebaseCrawlData(chatBotId, 1);

				const _data = {
					stats: details.data.crawlData?.stats,
					urls: _crawlDataResponse.data.results,
					pages: _crawlDataResponse.data.pages,
					knowledgebaseId: details.data._id
				}

				setDefaultCrauledData(_data)

				setIsSubmitting(false);
				toast({
					title: `Successfully updated your bot`,
					status: "success",
					isClosable: true,
				});

				// setPrimaryButtonLabel("Update Website Data");

			}
		}, 2000);
	}, [toast]);

	const [isEmbedError, setIsEmbedError] = React.useState<boolean>(false);
	const [chatBotType, setChatBotType] = React.useState<string>('default');

	const handleChatbotUpdate = React.useCallback(async (formValues) => {
		setIsSubmitting(true);
		setIsEmbedError(false)
		if (productSetupTab === 1) {
			setProductSetupLoadingText('Uploading files...');
			if (formValues.files?.length && formValues.files.length > 0) {
				setIsUploadingDocs(true);
				for (const file of formValues.files) {
					try {
						await addTrainingDoc(chatBot._id, file);
					} catch (error) {

					}
				}
				setIsUploadingDocs(false);
				const _docsDataResponse = await fetchKnowledgebaseCrawlDataForDocs(chatBot._id, 1);
				const _docsData: DocsKnowledgeData = {
					docs: _docsDataResponse.data.results,
					pages: _docsDataResponse.data.pages,
					knowledgebaseId: chatBot._id
				}
				setDocsData(_docsData);
			}
			setIsSubmitting(false);
			return;
		}

		setProductSetupLoadingText('Crawling your website data.. This may take some time depending on the size of the data.');

		try {

			if (formValues.websiteData.websiteUrl) {
				await updateWebsiteData(chatBot._id, {
					urls: [],
					websiteUrl: formValues.websiteData.websiteUrl,
					include: formValues.websiteData.include,
					exclude: formValues.websiteData.exclude,
				})
			}

			startEmbeding(chatBot._id)


		} catch (error: any) {
			setIsSubmitting(false);
			const errorData = error?.response?.data?.message
			toast({
				title: (errorData && errorData[0]) || 'Oops! Something went wrong',
				status: "error",
				isClosable: true,
			});
		}
	}, [chatBot._id, productSetupTab, startEmbeding, toast])

	useEffect(() => {
		async function fetchData() {
			try {
				const response = await fetcKnowledgebase(props.match.params.chatbotId);
				//generateEmbeddings(response.data._id);
				const chatBotData = response.data;

				// console.log("chatBotData", chatBotData);
				setChatBotType(chatBotData.chatbotType);
				if ((chatBotData.chatbotType) === 'vakmangids') {
					// setCurrentStep("scrape-website-data");
					setVakmangidsChatbotDefaultData(chatBotData.chatWidgeData || chatWidgetDefaultValuesForVakmangids);

					chatBotData.chatWidgeData = chatBotData.chatWidgeData || {
						backgroundColor: chatWidgetDefaultValuesForVakmangids.backgroundColor,
						fontColor: chatWidgetDefaultValuesForVakmangids.fontColor,
						borderRadius: chatWidgetDefaultValuesForVakmangids.borderRadius,
						placement: chatWidgetDefaultValuesForVakmangids.placement,
						heading: chatWidgetDefaultValuesForVakmangids.heading,
						description: chatWidgetDefaultValuesForVakmangids.description,
						welcomeMessages: chatWidgetDefaultValuesForVakmangids.welcomeMessages,
						customCSS: chatWidgetDefaultValuesForVakmangids.customCSS
					}
				} else {
					chatBotData.chatWidgeData = chatBotData.chatWidgeData || {
						backgroundColor: chatWidgetDefaultValues.backgroundColor,
						fontColor: chatWidgetDefaultValues.fontColor,
						borderRadius: chatWidgetDefaultValues.borderRadius,
						placement: chatWidgetDefaultValues.placement,
						heading: chatWidgetDefaultValues.heading,
						description: chatWidgetDefaultValues.description,
						welcomeMessages: chatWidgetDefaultValues.welcomeMessages,
						customCSS: chatWidgetDefaultValues.customCSS
					}
				}

				if (chatBotData.status === 'EMBEDDING_ERROR' || chatBotData.status === 'CRAWL_ERROR') {
					setIsEmbedError(true)
					setPrimaryButtonLabel("Create chatbot")
				} else if (chatBotData.status !== 'READY') {
					setIsSubmitting(true);
					startEmbeding(props.match.params.chatbotId)
				}

				const _crawlDataResponse = await fetchKnowledgebaseCrawlData(chatBotData._id, 1);

				const _data = {
					stats: chatBotData.crawlData?.stats,
					urls: _crawlDataResponse.data.results,
					pages: _crawlDataResponse.data.pages,
					knowledgebaseId: chatBotData._id
				}

				const _docsDataResponse = await fetchKnowledgebaseCrawlDataForDocs(chatBotData._id, 1);

				const _docsData: DocsKnowledgeData = {
					docs: _docsDataResponse.data.results,
					pages: _docsDataResponse.data.pages,
					knowledgebaseId: chatBotData._id
				}

				setDocsData(_docsData);
				setDefaultCrauledData(_data)
				setChatbot(response.data);
			} catch (error) {

			} finally {
			}
		}
		fetchData();
		return () => {
			setChatbot({});
		}
	}, [props.match.params.chatbotId, startEmbeding]);

	const [offlineMessages, setOfflineMessages] = React.useState<OfflineMessagePagination>();
	const [leads, setLeads] = React.useState<leadsPagination>();
	const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);


	useEffect(() => {
		async function fetchData() {
			try {
				// Fetch offline messages
				const offlineMessagesResponse = await getOfflineMessages(props.match.params.chatbotId, '1');
				setOfflineMessages(offlineMessagesResponse.data);

				// Fetch leads data
				const leadsResponse = await leadsData(props.match.params.chatbotId, 1);
				setLeads(leadsResponse.data);

				// Fetch training data
				const trainingDataResponse = await getTrainingData(props.match.params.chatbotId, '1');
				setCustomTrainingDataPage(trainingDataResponse.data);

				// Check if there are training data results
				if (trainingDataResponse.data.results.length > 0) {
					setIsCustomDataDetailsLoading(true);

					// Fetch training data details
					const trainingDataDetailsResponse = await getTrainingDataDetails(
						props.match.params.chatbotId,
						trainingDataResponse.data.results[0]?._id
					);

					setSelectedTrainingData(trainingDataDetailsResponse.data);
					setIsCustomDataDetailsLoading(false);
				}

			} catch (error) {
				// console.error('Error fetching data:', error);
			}
		}

		fetchData();
	}, [props.match.params.chatbotId]);


	const handleOfflinePageClick = React.useCallback(async (selectedPage: number) => {
		try {
			setIsChatLoading(true);
			setCount(count + 1);
			const response = await getOfflineMessages(props.match.params.chatbotId, (selectedPage + 1).toString());
			setOfflineMessages(response.data);
		} catch (error) {

		} finally {
			setIsChatLoading(false);
		}
	}, [props.match.params.chatbotId]);

	const handleLeads = React.useCallback(async (selectedPage: number) => {
		try {
			setIsChatLoading(true);
			setCount(count + 1);
			const response = await leadsData(props.match.params.chatbotId, (selectedPage + 1));
			setLeads(response.data);
		} catch (error) {

		} finally {
			setIsChatLoading(false);
		}
	}, [props.match.params.chatbotId]);

	const [deleteCustomDataLoading, setDeleteCustomDataLoading] = React.useState(false);

	const [customTrainingDataPage, setCustomTrainingDataPage] = React.useState<CustomDataPagination>({
		pages: 0,
		results: [],
	});

	const [isCustomDataLoading, setIsCustomDataLoading] = React.useState<boolean>(false);

	const [selectedTrainingData, setSelectedTrainingData] = React.useState<TrainingData>(
		{} as TrainingData
	);

	const [isCustomDataDetailsLoading, setIsCustomDataDetailsLoading] = React.useState(false);

	const handleCustomDataPageChange = React.useCallback(async (selectedPage: number) => {
		try {
			setIsCustomDataLoading(true);
			const response = await getTrainingData(props.match.params.chatbotId, (selectedPage + 1).toString());
			setCustomTrainingDataPage(response.data);

			if (response.data.results.length > 0) {
				setIsCustomDataDetailsLoading(true)
				const _trainingData = await getTrainingDataDetails(props.match.params.chatbotId, response.data.results[0]?._id)
				setSelectedTrainingData(_trainingData.data);
				setIsCustomDataDetailsLoading(false)
			}
		} catch (error) {

		} finally {
			setIsCustomDataLoading(false);
		}
	}, [props.match.params.chatbotId]);

	const handleQuestionDelete = React.useCallback(async () => {
		const id = questionsToDelete;
		setDeleteCustomDataLoading(true);
		try {
			await deleteTrainingData(props.match.params.chatbotId, id as string);
			const updatedResults = customTrainingDataPage?.results.filter((data) => data._id !== id);
			setCustomTrainingDataPage(prevPage => ({
				...prevPage,
				results: updatedResults,
			}));

			toast({
				title: `Custom data has been deleted successfully `,
				status: "success",
				isClosable: true,
			});
		} catch (error) {
			toast({
				title: `Oops! unable to delte custom data`,
				status: "error",
				isClosable: true,
			});
		} finally {
			setDeleteCustomDataLoading(false);
			setQuestionsToDelete('0');
			// onDeleteDialogClose();
			setIsDeleteDialogOpen(false);
		}


	}, [props.match.params.chatbotId, questionsToDelete, toast, customTrainingDataPage]);


	const goToStep = React.useCallback((step: Steps) => {
		setCurrentStep(step);
	}, []);

	const handleTrainingDataSave = React.useCallback((values) => {


		setCustomTrainingDataPage(prevPage => ({
			...prevPage,
			results: [values, ...prevPage.results]
		}));

	}, []);

	const handleTrainingDataUpdate = React.useCallback((values) => {

		const trainingDataToUpdate = customTrainingDataPage.results.find((data) => data._id === values._id);

		if (trainingDataToUpdate) {
			trainingDataToUpdate.title = values.q;
			trainingDataToUpdate.content = values.a;

			setCustomTrainingDataPage({ ...customTrainingDataPage });
		}

	}, [customTrainingDataPage]);
	const handleFormValues = (
		formValues: ProductSetupData,
		hasWebsiteDataChanged: boolean
	) => {

	};

	const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
		const formValues: any = {}; // Mock or retrieve the actual form data
		const hasWebsiteDataChanged = true; // Set based on your logic
		handleFormValues(formValues, hasWebsiteDataChanged);
	};



	const getAddToWebsiteContent = React.useCallback(() => {


		return <VStack spacing={12} alignItems="start">
			<VStack alignItems="start">
				<Flex alignItems={"center"} gap={2}>
					<Heading fontSize="16px" color="#212529" fontWeight="600" >
						ChatBot with Launcher Icon
					</Heading>
					<Tooltip fontSize={"11px"} label="A launcher icon will be displayed at the corner of your website. Once clicked, the full chat interface will appear.
">
						<Box
							cursor="pointer"
							as="span"
						>
							<GoInfo size={"16px"} color="#6C757D" />
						</Box>
					</Tooltip>
				</Flex>
				<Text color="#6C757D" fontSize="14px" mb="16px !important" mt="4px !important" fontWeight="400">A launcher icon will be displayed at the corner of your website. Once clicked, the full chat interface will appear.</Text>
				<Box display="flex" justifyContent="space-between" bg="#F8F9FA" width={"100%"} maxW="978px" borderRadius={'6px'}>
					<Box className={styles.codeBlock}>
						<span style={{ color: '#808080' }}>&lt;<span style={{ color: '#FF9500CC' }}>script</span>
							<span style={{ color: '#256CE8' }}> id</span>=<span style={{ color: '#17418C' }}>"__ultimabotSdk__"</span><span style={{ color: '#256CE8', paddingLeft: '4px' }}> data-chatbot-id</span>=<span style={{ color: '#17418C' }}>"{chatBot._id}"</span>
							<br></br>
							<span style={{ color: '#256CE8', paddingLeft: '20px' }}> src</span>=<span style={{ color: '#17418C' }}>"https://widget.ultimabot.ai/ultimabot-sdk.js"</span>
							&gt;</span>
						<br></br>
						<span style={{ color: '#808080' }}>&lt;/<span style={{ color: '#FF9500CC' }}>script</span>&gt;</span>
						<br />
						<span style={{ color: '#808080' }}>&lt;<span style={{ color: '#FF9500CC' }}>script</span>&gt;</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '20px' }}>
							document.addEventListener(<span style={{ color: '#17418C' }}>"DOMContentLoaded"</span>, () =&gt; &#123;
						</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '40px' }}>
							const sdkScript = document.getElementById(<span style={{ color: '#183691' }}>"__ultimabotSdk__"</span>);
						</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '40px' }}>
							sdkScript.setAttribute(<span style={{ color: '#183691' }}>"data-current-url"</span>, window.location.href);
						</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '40px' }}>
							const at = new URLSearchParams(window.location.search).get(<span style={{ color: '#17418C' }}>"at"</span>);
						</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '40px' }}>
							if (at) sdkScript?.setAttribute(<span style={{ color: '#17418C' }}>"at"</span>, at);
						</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '20px' }}>&#125;);</span>
						<br></br>
						<span style={{ color: '#808080' }}>&lt;/<span style={{ color: '#FF9500CC' }}>script</span>&gt;</span>

					</Box>
					<Button
						// colorScheme="blue"
						className={styles.copyBtn}
						bg="#6C757D"
						variant="solid"
						size="sm"
						isLoading={isSubmitting}
						isDisabled={isSubmitting}
						onClick={() => {
							navigator.clipboard.writeText(
								`
								<script id="__ultimabotSdk__" src="https://widget.ultimabot.ai/ultimabot-sdk.js" data-chatbot-id="${chatBot._id}"></script>
								<script>
								document.addEventListener("DOMContentLoaded", () => {
								const sdkScript = document.getElementById("__ultimabotSdk__");
                sdkScript.setAttribute("data-current-url", window.location.href);
								const at = new URLSearchParams(window.location.search).get("at");
								if (at) sdkScript?.setAttribute("at", at);
								});
								</script>`
							);
							toast({
								title: `Copied to Clipboard`,
								status: "info",
								isClosable: true,
							});
						}}
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M5 12.6491C4.72222 12.6491 4.48611 12.5519 4.29167 12.3575C4.09722 12.163 4 11.9269 4 11.6491V2.3158C4 2.03802 4.09722 1.80191 4.29167 1.60746C4.48611 1.41302 4.72222 1.3158 5 1.3158H12.3333C12.6111 1.3158 12.8472 1.41302 13.0417 1.60746C13.2361 1.80191 13.3333 2.03802 13.3333 2.3158V11.6491C13.3333 11.9269 13.2361 12.163 13.0417 12.3575C12.8472 12.5519 12.6111 12.6491 12.3333 12.6491H5ZM5 11.6491H12.3333V2.3158H5V11.6491ZM3 14.6491C2.72222 14.6491 2.48611 14.5519 2.29167 14.3575C2.09722 14.163 2 13.9269 2 13.6491V4.09913C2 3.95468 2.04722 3.83524 2.14167 3.7408C2.23611 3.64635 2.35556 3.59913 2.5 3.59913C2.64444 3.59913 2.76389 3.64635 2.85833 3.7408C2.95278 3.83524 3 3.95468 3 4.09913V13.6491H10.4C10.5444 13.6491 10.6639 13.6964 10.7583 13.7908C10.8528 13.8852 10.9 14.0047 10.9 14.1491C10.9 14.2936 10.8528 14.413 10.7583 14.5075C10.6639 14.6019 10.5444 14.6491 10.4 14.6491H3ZM5 2.3158V11.6491V2.3158Z" fill="white" />
						</svg>

					</Button>
				</Box>
				{/* <HStack mt="6">
				
				</HStack> */}
			</VStack>
			<VStack mt={'24px!important'} alignItems="start">
				<Flex alignItems={"center"} gap={2}>

					<Heading fontSize="16px" color="#212529" fontWeight="600">Embedded Chat Interface (No Launcher)</Heading>
					<Tooltip fontSize={"11px"} label="Chat interface is permanently displayed on your web page without a launcher icon.">
						<Box
							cursor="pointer"
							as="span"
						>
							<GoInfo size={"16px"} color="#6C757D" />
						</Box>
					</Tooltip>
				</Flex>
				<Text color="#6C757D" fontSize="14px" mb="16px !important" mt="4px !important" fontWeight="400">Chat interface is permanently displayed on your web page without a launcher icon.</Text>
				<Box display="flex" justifyContent="space-between" bg="#F8F9FA" width="978px" borderRadius={'6px'}>
					<Box className={styles.codeBlock}>
						<span style={{ color: '#808080' }}>&lt;<span style={{ color: '#FF9500CC' }}>iframe</span>
							<span style={{ color: '#256CE8', paddingLeft: '4px' }}> width</span>=<span style={{ color: '#17418C' }}>"500px"</span>
							<span style={{ color: '#256CE8', paddingLeft: '4px' }}> height</span>=<span style={{ color: '#17418C' }}>"700px"</span>
							<span style={{ color: '#256CE8', paddingLeft: '4px' }}> frameborder</span>=<span style={{ color: '#17418C' }}>"0"</span>
							<br></br>
							<span style={{ color: '#256CE8', paddingLeft: '20px' }}> src</span>=<span style={{ color: '#17418C' }}>"https://widget.ultimabot.ai/?kbId={chatBot._id}&embed=true&hide-chat-actions=true"</span>
							&gt;</span>
						<br></br>
						<span style={{ color: '#808080' }}>&lt;/<span style={{ color: '#FF9500CC' }}>iframe</span>&gt;</span>
						<br />
						<span style={{ color: '#808080' }}>&lt;<span style={{ color: '#FF9500CC' }}>script</span>&gt;</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '20px' }}>
							document.addEventListener(<span style={{ color: '#17418C' }}>"DOMContentLoaded"</span>, () =&gt; &#123;
						</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '40px' }}>
							const at = new URLSearchParams(window.location.search).get(<span style={{ color: '#17418C' }}>"at"</span>);
						</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '40px' }}>
							const iframe = document.querySelector(<span style={{ color: '#17418C' }}>"iframe[src*='https://widget.ultimabot.ai/']"</span>);
						</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '40px' }}>
							if (at &amp;&amp; iframe) iframe.src += <span style={{ color: '#17418C' }}>`&amp;at=${"{at}"}`</span>;
						</span>
						<br></br>
						<span style={{ color: '#256CE8', paddingLeft: '20px' }}>&#125;);</span>
						<br></br>
						<span style={{ color: '#808080' }}>&lt;/<span style={{ color: '#FF9500CC' }}>script</span>&gt;</span>

					</Box>
					<Box>
						<Button
							className={styles.copyBtn}
							bg="#6C757D"
							variant="solid"
							size="sm"
							isLoading={isSubmitting}
							isDisabled={isSubmitting}
							onClick={() => {
								navigator.clipboard.writeText(
									`<iframe width="500px" height="700px" frameborder="0"
									src="https://widget.ultimabot.ai/?kbId=${chatBot._id}&embed=true&hide-chat-actions=true">
									</iframe>
									<script>
										document.addEventListener("DOMContentLoaded", () => {
											const at = new URLSearchParams(window.location.search).get("at");
											const iframe = document.querySelector("iframe[src*='https://widget.ultimabot.ai/']");
											if (at && iframe) iframe.src += \`&at=\${at}\`;
										});
									</script>`
								);
								toast({
									title: `Copied to Clipboard`,
									status: "info",
									isClosable: true,
								});
							}}
						>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M5 12.6491C4.72222 12.6491 4.48611 12.5519 4.29167 12.3575C4.09722 12.163 4 11.9269 4 11.6491V2.3158C4 2.03802 4.09722 1.80191 4.29167 1.60746C4.48611 1.41302 4.72222 1.3158 5 1.3158H12.3333C12.6111 1.3158 12.8472 1.41302 13.0417 1.60746C13.2361 1.80191 13.3333 2.03802 13.3333 2.3158V11.6491C13.3333 11.9269 13.2361 12.163 13.0417 12.3575C12.8472 12.5519 12.6111 12.6491 12.3333 12.6491H5ZM5 11.6491H12.3333V2.3158H5V11.6491ZM3 14.6491C2.72222 14.6491 2.48611 14.5519 2.29167 14.3575C2.09722 14.163 2 13.9269 2 13.6491V4.09913C2 3.95468 2.04722 3.83524 2.14167 3.7408C2.23611 3.64635 2.35556 3.59913 2.5 3.59913C2.64444 3.59913 2.76389 3.64635 2.85833 3.7408C2.95278 3.83524 3 3.95468 3 4.09913V13.6491H10.4C10.5444 13.6491 10.6639 13.6964 10.7583 13.7908C10.8528 13.8852 10.9 14.0047 10.9 14.1491C10.9 14.2936 10.8528 14.413 10.7583 14.5075C10.6639 14.6019 10.5444 14.6491 10.4 14.6491H3ZM5 2.3158V11.6491V2.3158Z" fill="white" />
							</svg>
						</Button>
					</Box>
				</Box>
				<HStack mt="6">

				</HStack>
			</VStack>
			<VStack mt={'24px!important'} alignItems="start">
				<Flex alignItems={"center"} gap={2}>

					<Heading fontSize="16px" color="#212529" fontWeight="600">Public Link to Chat Interface</Heading>
					<Tooltip fontSize={"11px"} label="Share the chat interface with anyone with the below unique link.">
						<Box
							cursor="pointer"
							as="span"
						>
							<GoInfo size={"16px"} color="#6C757D" />
						</Box>
					</Tooltip>
				</Flex>
				<Text color="#6C757D" fontSize="14px" fontWeight="400" my="4px !important">
					Share the chat interface with anyone with the below unique link.
				</Text>
				<Box display="flex" justifyContent="space-between" bg="#F8F9FA" width="978px" borderRadius={'6px'}>
					<Box className={styles.codeBlock}>
						<span style={{ color: '#256CE8' }}>https://widget.ultimabot.ai/?kbId={chatBot._id}&embed=true&hide-chat-actions=true</span>
					</Box>
					<Box>
						<Button
							className={styles.copyBtn}
							bg="#6C757D"
							variant="solid"
							size="sm"
							isLoading={isSubmitting}
							isDisabled={isSubmitting}
							onClick={() => {
								navigator.clipboard.writeText(
									`https://widget.ultimabot.ai/?kbId=${chatBot._id}&embed=true&hide-chat-actions=true`
								);
								toast({
									title: `Copied to Clipboard`,
									status: "info",
									isClosable: true,
								});
							}}
						>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M5 12.6491C4.72222 12.6491 4.48611 12.5519 4.29167 12.3575C4.09722 12.163 4 11.9269 4 11.6491V2.3158C4 2.03802 4.09722 1.80191 4.29167 1.60746C4.48611 1.41302 4.72222 1.3158 5 1.3158H12.3333C12.6111 1.3158 12.8472 1.41302 13.0417 1.60746C13.2361 1.80191 13.3333 2.03802 13.3333 2.3158V11.6491C13.3333 11.9269 13.2361 12.163 13.0417 12.3575C12.8472 12.5519 12.6111 12.6491 12.3333 12.6491H5ZM5 11.6491H12.3333V2.3158H5V11.6491ZM3 14.6491C2.72222 14.6491 2.48611 14.5519 2.29167 14.3575C2.09722 14.163 2 13.9269 2 13.6491V4.09913C2 3.95468 2.04722 3.83524 2.14167 3.7408C2.23611 3.64635 2.35556 3.59913 2.5 3.59913C2.64444 3.59913 2.76389 3.64635 2.85833 3.7408C2.95278 3.83524 3 3.95468 3 4.09913V13.6491H10.4C10.5444 13.6491 10.6639 13.6964 10.7583 13.7908C10.8528 13.8852 10.9 14.0047 10.9 14.1491C10.9 14.2936 10.8528 14.413 10.7583 14.5075C10.6639 14.6019 10.5444 14.6491 10.4 14.6491H3ZM5 2.3158V11.6491V2.3158Z" fill="white" />
							</svg>
						</Button>
					</Box>
				</Box>
			</VStack>
		</VStack>

	}, [chatBot._id, isSubmitting, toast]);

	const getCustomDataComponent = React.useCallback(() => {

		if (!customTrainingDataPage?.results.length) {

			return <VStack
				alignItems="center"
				direction="column"
				justifyContent="center"
				w="100%"
				h="100%"
				pt={32}
				pb={32}
				spacing="9"
			>
				<NoDataFineTuneIcon width="auto" height="250px" />
				<Box textAlign="center">
					<Heading
						maxW="580px"
						fontSize="16px"
						fontWeight="500"
						as="h3"
						mb="4"
						color="gray.500"
						lineHeight="medium"
						textAlign="center"
					>
						The more data you add, the better your Bot response will be.
					</Heading>
				</Box>
			</VStack>
		}

		return <>
			<Box w="450px" className={styles.questionCont} pos="relative">
				{
					isCustomDataLoading && <Flex
						pos="absolute"
						align="center"
						justify="center"
						top={0}
						bottom={0}
						right={0}
						left={0}
						bg="whiteAlpha.700"
					>
						<Spinner />
					</Flex>
				}

				<Flex
					direction="column"
					h="calc(100% - 47px)"
					overflowY="auto"
					overflowX="hidden"
				>
					{customTrainingDataPage?.results.map((data) => (
						<Box
							borderBottom="1px"
							borderBottomColor="gray.100"
							bg={selectedTrainingData._id === data._id ? 'rgb(227, 243, 255)' : 'white'}
							borderRight={selectedTrainingData._id === data._id ? "2px" : "0"}
							borderRightColor="#2977ff"
							pr="40px !important"
							className={classNames(styles.questionTab, {
								[styles.activeQuestion]: selectedTrainingData && selectedTrainingData._id === data._id
							})} key={data._id} p="3">
							<Box
								onClick={async () => {

									try {
										setIsCustomDataDetailsLoading(true)
										const _trainingData = await getTrainingDataDetails(props.match.params.chatbotId, data._id)
										setSelectedTrainingData(_trainingData.data);
										setIsCustomDataDetailsLoading(false)
									} catch (error) {

									} finally {
										setIsCustomDataDetailsLoading(false)
									}


								}}>
								<Text fontSize="sm" noOfLines={2} fontWeight="medium">
									{data.title}
								</Text>
							</Box>

							<IconButton
								className={styles.questionDeleteBtn}
								variant='outline'
								colorScheme='gray'
								aria-label='Call Sage'
								fontSize='16px'
								size="16px"
								isLoading={deleteCustomDataLoading && questionsToDelete === data._id}
								onClick={() => {
									const userRole = CurrentUser.get();
									// if (userRole.role == "admin" && chatBot.chatbotType !== "vakmangids") {
									// 	toast({
									// 		title: `You cannot change the specific settings of the admin's project.`,
									// 		status: "error",
									// 		isClosable: true,
									// 	});

									// } else {
									// }
									setQuestionsToDelete(data._id)
									setIsDeleteDialogOpen(true)
								}}
								color="red"
								icon={<RiDeleteBin5Line />}
							/>
						</Box>
					))}
				</Flex>

				<Box
					bg="white"
					borderTop="1px"
					borderRight="1px"
					borderColor="gray.200"
					justifyContent="center"
				>
					<Paginator onPageChange={handleCustomDataPageChange} pageRangeDisplayed={5} pageCount={customTrainingDataPage.pages} />
				</Box>
			</Box>
			<Box w="calc(100% - 450px)" overflowY="auto" className={styles.answerCont}>
				{isCustomDataDetailsLoading && <Box className={styles.customDataloadingCont}>	<Spinner /></Box>}
				{selectedTrainingData && <AddTrainingDataForm knowledgeBaseId={props.match.params.chatbotId} chatbotType={chatBot.chatbotType} onSubmit={handleTrainingDataUpdate} selectedTrainingData={selectedTrainingData} />}
			</Box>
		</>
	}, [customTrainingDataPage?.results, customTrainingDataPage.pages, isCustomDataLoading, handleCustomDataPageChange, isCustomDataDetailsLoading, selectedTrainingData, props.match.params.chatbotId, handleTrainingDataUpdate, deleteCustomDataLoading, questionsToDelete, onDeleteDialogOpen]);



	const getExcludedPaths = React.useCallback(() => {
		if (!chatBot._id || !chatBot.websiteData) return;
		const excludedPaths = chatBot.websiteData.exclude.join(',')
		return excludedPaths;
	}, [chatBot]);
	const getIncludedPaths = React.useCallback(() => {
		if (!chatBot._id || !chatBot.websiteData) return;
		const includedPaths = chatBot.websiteData.include.join(',')
		return includedPaths;
	}, [chatBot]);







	const getDefaultCustomizationValues = React.useCallback(() => {
		if (!chatBot._id) return;
		if (chatBot.chatbotType === "vakmangids") {
			return {

				backgroundColor: chatBot.chatWidgeData?.backgroundColor,
				fontColor: chatBot.chatWidgeData?.fontColor,
				placement: chatBot.chatWidgeData?.placement,
				popupDelayMs: chatBot.chatWidgeData?.popupDelayMs,
				showIconPopup: chatBot.chatWidgeData?.showIconPopup ?? true,
				excludedUrls: chatBot.chatWidgeData?.excludedUrls || [],
				borderRadius: chatBot.chatWidgeData?.borderRadius,
				heading: chatBot.chatWidgeData?.heading,
				description: chatBot.chatWidgeData?.description,
				offlineMessage: chatBot.chatWidgeData?.offlineMessage,
				showReadMore: chatBot.chatWidgeData?.showReadMore === undefined ? chatWidgetDefaultValuesForVakmangids.showReadMore : chatBot.chatWidgeData?.showReadMore,
				showAsPopup: chatBot.chatWidgeData?.showAsPopup === undefined ? chatWidgetDefaultValuesForVakmangids.showAsPopup : chatBot.chatWidgeData?.showAsPopup,
				popupDelay: chatBot.chatWidgeData?.popupDelay || chatWidgetDefaultValuesForVakmangids.popupDelay,
				collectEmailText: chatBot.chatWidgeData?.collectEmailText || chatWidgetDefaultValuesForVakmangids.collectEmailText,
				collectEmail: chatBot.chatWidgeData?.collectEmail,
				adminEmail: chatBot.chatWidgeData?.adminEmail,
				customCSS: chatBot.chatWidgeData?.customCSS || chatWidgetDefaultValuesForVakmangids.customCSS,
				avatarFieldValue: chatBot.chatWidgeData?.avatarFieldValue || chatWidgetDefaultValuesForVakmangids.avatarFieldValue || "",
				avatarFieldLabel: chatBot.chatWidgeData?.avatarFieldLabel || chatWidgetDefaultValuesForVakmangids.avatarFieldLabel || "",
				emailLabel: chatBot.chatWidgeData?.emailLabel || chatWidgetDefaultValuesForVakmangids.emailLabel || "",
				phoneFieldLabel: chatBot.chatWidgeData?.phoneFieldLabel || chatWidgetDefaultValuesForVakmangids.phoneFieldLabel || "",
				whatsappFieldLabel: chatBot.chatWidgeData?.whatsappFieldLabel || chatWidgetDefaultValuesForVakmangids.whatsappFieldLabel || "",
				videoFieldLabel: chatBot.chatWidgeData?.videoFieldLabel || chatWidgetDefaultValuesForVakmangids.videoFieldLabel || "",
				appointmentFieldLabel: chatBot.chatWidgeData?.appointmentFieldLabel || chatWidgetDefaultValuesForVakmangids.appointmentFieldLabel || "",
				contentEmail: chatBot.chatWidgeData?.contentEmail || chatWidgetDefaultValuesForVakmangids.contentEmail,
				contentPhone: chatBot.chatWidgeData?.contentPhone || chatWidgetDefaultValuesForVakmangids.contentPhone,
				contentWhatsapp: chatBot.chatWidgeData?.contentWhatsapp || chatWidgetDefaultValuesForVakmangids.contentWhatsapp,
				contentVideo: chatBot.chatWidgeData?.contentVideo || chatWidgetDefaultValuesForVakmangids.contentVideo,
				contentAppointment: chatBot.chatWidgeData?.contentAppointment || chatWidgetDefaultValuesForVakmangids.contentAppointment,
				questionExamples: chatBot.chatWidgeData?.questionExamples || chatWidgetDefaultValuesForVakmangids.questionExamples,
				welcomeMessages: chatBot.chatWidgeData?.welcomeMessage ? [chatBot.chatWidgeData?.welcomeMessage] : chatBot.chatWidgeData?.welcomeMessages || chatWidgetDefaultValuesForVakmangids.welcomeMessages,
				prompt: chatBot.prompt || chatWidgetDefaultValuesForVakmangids.prompt,
				defaultAnswer: chatBot.defaultAnswer || chatWidgetDefaultValuesForVakmangids.defaultAnswer,
				launcherIcon: chatBot.chatWidgeData?.launcherIcon || chatWidgetDefaultValuesForVakmangids.launcherIcon,
				chatInputPlaceholderText: chatBot.chatWidgeData?.chatInputPlaceholderText || chatWidgetDefaultValuesForVakmangids.chatInputPlaceholderText,
				assistantTabHeader: chatBot.chatWidgeData?.assistantTabHeader || chatWidgetDefaultValuesForVakmangids.assistantTabHeader,
				offlineMsgTabHeader: chatBot.chatWidgeData?.offlineMsgTabHeader || chatWidgetDefaultValuesForVakmangids.offlineMsgTabHeader,
				readMoreText: chatBot.chatWidgeData?.readMoreText || chatWidgetDefaultValuesForVakmangids.readMoreText,
				offlineMsgHeading: chatBot.chatWidgeData?.offlineMsgHeading || chatWidgetDefaultValuesForVakmangids.offlineMsgHeading,
				offlineMsgDescription: chatBot.chatWidgeData?.offlineMsgDescription || chatWidgetDefaultValuesForVakmangids.offlineMsgDescription,
				nameFieldLabel: chatBot.chatWidgeData?.nameFieldLabel || chatWidgetDefaultValuesForVakmangids.nameFieldLabel,
				nameFieldPlaceholder: chatBot.chatWidgeData?.nameFieldPlaceholder || chatWidgetDefaultValuesForVakmangids.nameFieldPlaceholder,
				emailFieldLabel: chatBot.chatWidgeData?.emailFieldLabel || chatWidgetDefaultValuesForVakmangids.emailFieldLabel,
				privacypolicyLabel: chatBot.chatWidgeData?.privacypolicyLabel || chatWidgetDefaultValuesForVakmangids.privacypolicyLabel || "",
				privacypolicyValue: chatBot.chatWidgeData?.privacypolicyValue || chatWidgetDefaultValuesForVakmangids.privacypolicyValue || "",
				termsandconditionsLabel: chatBot.chatWidgeData?.termsandconditionsLabel || chatWidgetDefaultValuesForVakmangids.termsandconditionsLabel || "",
				termsandconditionsValue: chatBot.chatWidgeData?.termsandconditionsValue || chatWidgetDefaultValuesForVakmangids.termsandconditionsValue || "",
				emailFieldPlaceholder: chatBot.chatWidgeData?.emailFieldPlaceholder || chatWidgetDefaultValuesForVakmangids.emailFieldPlaceholder,
				msgFieldLabel: chatBot.chatWidgeData?.msgFieldLabel || chatWidgetDefaultValuesForVakmangids.msgFieldLabel,
				msgFieldPlaceholder: chatBot.chatWidgeData?.msgFieldPlaceholder || chatWidgetDefaultValuesForVakmangids.msgFieldPlaceholder,
				requiredFieldMsg: chatBot.chatWidgeData?.requiredFieldMsg || chatWidgetDefaultValuesForVakmangids.requiredFieldMsg,
				invalidEmailMsg: chatBot.chatWidgeData?.invalidEmailMsg || chatWidgetDefaultValuesForVakmangids.invalidEmailMsg,
				formSubmitBtnLabel: chatBot.chatWidgeData?.formSubmitBtnLabel || chatWidgetDefaultValuesForVakmangids.formSubmitBtnLabel,
				formSubmitBtnSubmittingText: chatBot.chatWidgeData?.formSubmitBtnSubmittingText || chatWidgetDefaultValuesForVakmangids.formSubmitBtnSubmittingText,
				formSubmitSuccessMsg: chatBot.chatWidgeData?.formSubmitSuccessMsg || chatWidgetDefaultValuesForVakmangids.formSubmitSuccessMsg,
				formSubmitErrorMsg: chatBot.chatWidgeData?.formSubmitErrorMsg || chatWidgetDefaultValuesForVakmangids.formSubmitErrorMsg,
				formSendAgainBtnLabel: chatBot.chatWidgeData?.formSendAgainBtnLabel || chatWidgetDefaultValuesForVakmangids.formSendAgainBtnLabel,
				formTryAgainBtnLabel: chatBot.chatWidgeData?.formTryAgainBtnLabel || chatWidgetDefaultValuesForVakmangids.formTryAgainBtnLabel,
				model: chatBot.chatWidgeData?.model || chatWidgetDefaultValuesForVakmangids.model,
				leadCollectionData: chatBot.chatWidgeData?.leadCollectionData || chatWidgetDefaultValuesForVakmangids.leadCollectionData,
				thankyouEmailText: chatBot.chatWidgeData?.thankyouEmailText || chatWidgetDefaultValues.thankyouEmailText,
				isThankYouEmailEnabled: chatBot.chatWidgeData?.isThankYouEmailEnabled || chatWidgetDefaultValues.isThankYouEmailEnabled,
			};
		} else {
			return {

				backgroundColor: chatBot.chatWidgeData?.backgroundColor,
				fontColor: chatBot.chatWidgeData?.fontColor,
				placement: chatBot.chatWidgeData?.placement,
				popupDelayMs: chatBot.chatWidgeData?.popupDelayMs,
				showIconPopup: chatBot.chatWidgeData?.showIconPopup ?? true,
				excludedUrls: chatBot.chatWidgeData?.excludedUrls || [],
				borderRadius: chatBot.chatWidgeData?.borderRadius,
				heading: chatBot.chatWidgeData?.heading,
				description: chatBot.chatWidgeData?.description,
				offlineMessage: chatBot.chatWidgeData?.offlineMessage,
				showReadMore: chatBot.chatWidgeData?.showReadMore === undefined ? chatWidgetDefaultValues.showReadMore : chatBot.chatWidgeData?.showReadMore,
				showAsPopup: chatBot.chatWidgeData?.showAsPopup === undefined ? chatWidgetDefaultValues.showAsPopup : chatBot.chatWidgeData?.showAsPopup,
				popupDelay: chatBot.chatWidgeData?.popupDelay || chatWidgetDefaultValues.popupDelay,
				collectEmailText: chatBot.chatWidgeData?.collectEmailText || chatWidgetDefaultValues.collectEmailText,
				collectEmail: chatBot.chatWidgeData?.collectEmail,
				adminEmail: chatBot.chatWidgeData?.adminEmail,
				customCSS: chatBot.chatWidgeData?.customCSS || chatWidgetDefaultValues.customCSS,
				avatarFieldValue: chatBot.chatWidgeData?.avatarFieldValue || chatWidgetDefaultValuesForVakmangids.avatarFieldValue || "",
				avatarFieldLabel: chatBot.chatWidgeData?.avatarFieldLabel || chatWidgetDefaultValuesForVakmangids.avatarFieldLabel || "",
				emailLabel: chatBot.chatWidgeData?.emailLabel || chatWidgetDefaultValuesForVakmangids.emailLabel || "",
				phoneFieldLabel: chatBot.chatWidgeData?.phoneFieldLabel || chatWidgetDefaultValuesForVakmangids.phoneFieldLabel || "",
				whatsappFieldLabel: chatBot.chatWidgeData?.whatsappFieldLabel || chatWidgetDefaultValuesForVakmangids.whatsappFieldLabel || "",
				videoFieldLabel: chatBot.chatWidgeData?.videoFieldLabel || chatWidgetDefaultValuesForVakmangids.videoFieldLabel || "",
				appointmentFieldLabel: chatBot.chatWidgeData?.appointmentFieldLabel || chatWidgetDefaultValuesForVakmangids.appointmentFieldLabel || "",
				contentEmail: chatBot.chatWidgeData?.contentEmail || chatWidgetDefaultValues.contentEmail,
				contentPhone: chatBot.chatWidgeData?.contentPhone || chatWidgetDefaultValues.contentPhone,
				contentWhatsapp: chatBot.chatWidgeData?.contentWhatsapp || chatWidgetDefaultValues.contentWhatsapp,
				contentVideo: chatBot.chatWidgeData?.contentVideo || chatWidgetDefaultValues.contentVideo,
				contentAppointment: chatBot.chatWidgeData?.contentAppointment || chatWidgetDefaultValues.contentAppointment,
				questionExamples: chatBot.chatWidgeData?.questionExamples || chatWidgetDefaultValues.questionExamples,
				welcomeMessages: chatBot.chatWidgeData?.welcomeMessage ? [chatBot.chatWidgeData?.welcomeMessage] : chatBot.chatWidgeData?.welcomeMessages || chatWidgetDefaultValues.welcomeMessages,
				prompt: chatBot.prompt || chatWidgetDefaultValues.prompt,
				defaultAnswer: chatBot.defaultAnswer || chatWidgetDefaultValues.defaultAnswer,
				launcherIcon: chatBot.chatWidgeData?.launcherIcon || chatWidgetDefaultValues.launcherIcon,
				chatInputPlaceholderText: chatBot.chatWidgeData?.chatInputPlaceholderText || chatWidgetDefaultValues.chatInputPlaceholderText,
				assistantTabHeader: chatBot.chatWidgeData?.assistantTabHeader || chatWidgetDefaultValues.assistantTabHeader,
				offlineMsgTabHeader: chatBot.chatWidgeData?.offlineMsgTabHeader || chatWidgetDefaultValues.offlineMsgTabHeader,
				readMoreText: chatBot.chatWidgeData?.readMoreText || chatWidgetDefaultValues.readMoreText,
				offlineMsgHeading: chatBot.chatWidgeData?.offlineMsgHeading || chatWidgetDefaultValues.offlineMsgHeading,
				offlineMsgDescription: chatBot.chatWidgeData?.offlineMsgDescription || chatWidgetDefaultValues.offlineMsgDescription,
				nameFieldLabel: chatBot.chatWidgeData?.nameFieldLabel || chatWidgetDefaultValues.nameFieldLabel,
				nameFieldPlaceholder: chatBot.chatWidgeData?.nameFieldPlaceholder || chatWidgetDefaultValues.nameFieldPlaceholder,
				emailFieldLabel: chatBot.chatWidgeData?.emailFieldLabel || chatWidgetDefaultValues.emailFieldLabel,
				emailFieldPlaceholder: chatBot.chatWidgeData?.emailFieldPlaceholder || chatWidgetDefaultValues.emailFieldPlaceholder,
				privacypolicyLabel: chatBot.chatWidgeData?.privacypolicyLabel || chatWidgetDefaultValuesForVakmangids.privacypolicyLabel || "",
				privacypolicyValue: chatBot.chatWidgeData?.privacypolicyValue || chatWidgetDefaultValuesForVakmangids.privacypolicyValue || "",
				termsandconditionsLabel: chatBot.chatWidgeData?.termsandconditionsLabel || chatWidgetDefaultValuesForVakmangids.termsandconditionsLabel || "",
				termsandconditionsValue: chatBot.chatWidgeData?.termsandconditionsValue || chatWidgetDefaultValuesForVakmangids.termsandconditionsValue || "",

				msgFieldLabel: chatBot.chatWidgeData?.msgFieldLabel || chatWidgetDefaultValues.msgFieldLabel,
				msgFieldPlaceholder: chatBot.chatWidgeData?.msgFieldPlaceholder || chatWidgetDefaultValues.msgFieldPlaceholder,
				requiredFieldMsg: chatBot.chatWidgeData?.requiredFieldMsg || chatWidgetDefaultValues.requiredFieldMsg,
				invalidEmailMsg: chatBot.chatWidgeData?.invalidEmailMsg || chatWidgetDefaultValues.invalidEmailMsg,
				formSubmitBtnLabel: chatBot.chatWidgeData?.formSubmitBtnLabel || chatWidgetDefaultValues.formSubmitBtnLabel,
				formSubmitBtnSubmittingText: chatBot.chatWidgeData?.formSubmitBtnSubmittingText || chatWidgetDefaultValues.formSubmitBtnSubmittingText,
				formSubmitSuccessMsg: chatBot.chatWidgeData?.formSubmitSuccessMsg || chatWidgetDefaultValues.formSubmitSuccessMsg,
				formSubmitErrorMsg: chatBot.chatWidgeData?.formSubmitErrorMsg || chatWidgetDefaultValues.formSubmitErrorMsg,
				formSendAgainBtnLabel: chatBot.chatWidgeData?.formSendAgainBtnLabel || chatWidgetDefaultValues.formSendAgainBtnLabel,
				formTryAgainBtnLabel: chatBot.chatWidgeData?.formTryAgainBtnLabel || chatWidgetDefaultValues.formTryAgainBtnLabel,
				model: chatBot.chatWidgeData?.model || chatWidgetDefaultValues.model,
				leadCollectionData: chatBot.chatWidgeData?.leadCollectionData || chatWidgetDefaultValues.leadCollectionData,
				thankyouEmailText: chatBot.chatWidgeData?.thankyouEmailText || chatWidgetDefaultValues.thankyouEmailText,
				isThankYouEmailEnabled: chatBot.chatWidgeData?.isThankYouEmailEnabled || chatWidgetDefaultValues.isThankYouEmailEnabled,

			};
		}
	}, [chatBot]);
	const handlePrimaryBtnClick = (formValues: ProductSetupData, hasWebsiteDataChanged: boolean) => {
		// You can also call another function here if needed
		handleChatbotUpdate(formValues);
	};

	const [isChatLoadingInner, setIsChatLoadingInner] = React.useState<boolean>(true);



	const getMainComponent = React.useCallback(() => {

		if (!chatBot._id) {
			return (
				<Flex h="100%" alignItems="center" justifyContent="center">
					<Spinner
						thickness="2px"
						speed="0.65s"
						emptyColor="gray.200"
						color="gray.700"
						size="xl"
					/>
				</Flex>
			);
		}

		return (
			<>
				<Flex
					h="100%"
					direction="column"

					style={{
						display: currentStep === "scrape-website-data" ? "flex" : "none",
					}}
				>
					<ChatBotProductSetup
						onCrawlDataPaginationClick={getCrawlDataPagination}
						onDocsDataPaginationClick={getDocsDataPagination}
						defaultWebsite={chatBot.websiteData?.websiteUrl}
						defualtChatbotEnabled={chatBot.isChatbotEnabled}
						chatbotType={chatBot.chatbotType}
						defaultExcludedPaths={getExcludedPaths()}
						defaultIncludedPaths={getIncludedPaths()}
						onTabsChange={handleTabChange}
						getCrawlDataPagination={getCrawlDataPagination}
						showSecondaryButton
						disableTabs={false}
						onSecondaryBtnClick={() => {
							history.push("/app/bots/");
						}}
						defaultCrauledData={defaultCrauledData}
						isSubmitting={isSubmitting}
						isUploadingDocs={isUploadingDocs}
						docsDataLoading={docsDataLoading}
						docsData={docsData}
						crawlDataLoading={crawlDataLoading}
						loadingText={productSetupLoadingText}
						primaryButtonLabel={primaryButtonLabel}
						disableWebsiteInput={true}
						onPrimaryBtnClick={(formValues: ProductSetupData, hasWebsiteDataChanged: boolean) => {
							handleChatbotUpdate(formValues)
						}}
						paddingUsed="20px"
					/>
				</Flex>
				<Flex
					h="100%"
					direction="column"
					style={{
						display: currentStep === "customize" ? "flex" : "none",
					}}
				>


				</Flex>
				<Flex
					direction="column"
					style={{
						display: currentStep === "add-to-site" ? "flex" : "none",
					}}
					h="100%" overflow="auto"
				>
					<Box>
						<Box>
							<Text
								fontSize="20px"
								fontWeight="600"
								mb="4px" // margin-bottom for spacing
								color="#1A202C"
							>
								Add to your website
							</Text>
							<Text fontSize="16px" color="#6C757D" fontWeight="400" mb="24px">
								Choose any of the below options to add the bot to your website.
							</Text>
						</Box>
					</Box>

					<Flex direction="column" alignItems="start" w={"600px"} minW={"100%"}>
						{getAddToWebsiteContent()}
					</Flex>
				</Flex>
				<Flex
					direction="column"
					style={{
						display: currentStep === "train-custom-data" ? "flex" : "none",
					}}
					alignItems="center"
					h="100%" overflow="auto"
				>
					<VStack alignItems="start" w="100%" position="relative">
						{/* <SectionTitle title="Fine tune data" description="Improve your chatbot by adding more training data. The more you add, the better its responses. Group logically & avoid lengthy inputs." /> */}
						<Box>
							<Text
								fontSize="20px"
								fontWeight="600"
								mb="4px" // margin-bottom for spacing
								color="#1A202C"
							>
								Fine Tune Data
							</Text>
							<Text fontSize="16px" maxW={"85%"} color="#6C757D" fontWeight="400" mb="24px">
								Improve your Bot by adding more training data. The more you add, the better its responses. Group logically & avoid lengthy inputs.
							</Text>
						</Box>
						<Box position="absolute" right="0" bottom="8">
							<AddTrainingData knowledgeBaseId={props.match.params.chatbotId} chatbotType={chatBot.chatbotType} onSubmit={handleTrainingDataSave} answer="" question="" />
						</Box>
					</VStack>
					<Flex w="100%" className={styles.trainingDataCont}>
						{getCustomDataComponent()}
					</Flex>
				</Flex>

				<Flex
					direction="column"
					style={{
						display: currentStep === "custom-prompt" ? "flex" : "none",
					}}
					h="100%" overflow="auto"
				>
					<CustomPrompt chatbotId={props.match.params.chatbotId} chatbotType={chatBot.chatbotType} />
				</Flex>

				<Flex
					direction="column"
					style={{
						display: currentStep === "chat-sessions" ? "flex" : "none",
					}}
					h="100%" overflow="auto"
				>
					{props.match.params.chatbotId ? <ChatSessionsNew chatbotType={chatBot.chatbotType} chatbotId={props.match.params.chatbotId} chatBotName={chatBot.name} /> : null}
				</Flex>
				<Flex
					direction="column"
					style={{
						display: currentStep === "custom-prompt" ? "flex" : "none",
					}}
					h="100%" overflow="auto"
				>
				</Flex>
				<Flex
					direction="column"
					style={{
						display: currentStep === 'custom-domain' ? 'flex' : 'none',
					}}
					h="100%"
					overflow="auto"
				>
					<SectionTitle
						title="Set custom domain"
						description="Access the bot from your domain"
					/>
					{chatBot._id ? <CustomDomain defaultCustomDomain={chatBot.customDomain} chatBotId={chatBot._id}></CustomDomain> : null}
				</Flex>
				<Flex
					direction="column"
					style={{
						display: currentStep === "offline-messages" ? "flex" : "none",
					}}
					alignItems="center"
					h="100%"
					maxW={"100%"}
					// width={"920px"}
					overflow="auto"
				>
					{/* <SectionTitle title="Offline messages" description="Offline messages sent by your customers." /> */}
					<Flex w="100%" className={styles.trainingDataCont} border="none">
						{offlineMessages && offlineMessages.results && <OfflineMessagesNew isChatListLoading={isChatLoading} onPageChange={handleOfflinePageClick} chatSessionsPage={offlineMessages} knowledgeBaseId={props.match.params.chatbotId} pageNumber={count} />}
					</Flex>
				</Flex>
				<Flex
					direction="column"
					style={{
						display: currentStep === "leads" ? "flex" : "none",
					}}
					alignItems="center"
					h="100%" overflow="auto"
				>
					<Flex w="100%" border="none" className={styles.trainingDataCont}>
						{leads && leads.results && <LeadsNew isChatListLoading={isChatLoading} onPageChange={handleLeads} chatSessionsPage={leads} knowledgeBaseId={props.match.params.chatbotId} pageNumber={count} />}

					</Flex>
				</Flex>
				<Flex
					direction="column"
					style={{
						display: currentStep === "settings" ? "flex" : "none",
					}}
					alignItems="center"
					h="100%" overflow="auto"
				>
					<Box w="100%" border="none" className={styles.trainingDataCont}>


						{
							chatBot._id && <ChatBotsCustomize
								onBackClick={() => {
									history.push("/app/bots/");
								}}
								chatBotId={chatBot._id}
								isSubmitting={isSubmitting}
								primaryButtonLabel="Update Widget Style"
								chatBotType={chatBot.chatbotType}
								defaultCustomizationValues={getDefaultCustomizationValues()}
								onNextClick={async (formData: ChatBotCustomizeData) => {
									try {
										let updatePromiseList = [];
										if (formData.prompt !== chatBot.prompt) {
											// updatePromiseList.push(updatePrompt(chatBot._id, formData.prompt || ''));
										}
										if (formData.defaultAnswer !== chatBot.defaultAnswer) {
											updatePromiseList.push(updateDefaultAnswer(chatBot._id, formData.defaultAnswer || ''));
										}

										if (formData.adminEmail !== chatBot.adminEmail) {
											updatePromiseList.push(updateAdminEmail(chatBot._id, formData.adminEmail || chatBot.adminEmail || userProfile?.email));
										}
										await Promise.all(updatePromiseList);
										await customizeWidget(chatBot._id, {
											...formData, excludedUrls: (formData as any).excludedUrls.filter(
												(url: string) => url && url.trim() !== ""
											),
										} as any);
										toast({
											title: `ChatBot customizations have been updated successfully`,
											status: "success",
											isClosable: true,
										});
									} catch (error: any) {
										toast({
											title: error?.response?.data?.message || error?.message || `Oops! Something went wrong`,
											status: "error",
											isClosable: true,
										});
									} finally {
										setIsSubmitting(false)
									}

								}}
							/>
						}
					</Box>
				</Flex>
				<Flex
					direction="column"
					style={{
						display: currentStep === "chatbot" ? "flex" : "none",
					}}
					alignItems="center"
					h="100%" overflow="auto"
				>
					<SectionTitle title="Try out Bot" description="Chat with your bot and see how it responds. If you don't get the desired response, follow the instructions below." />
					<HStack w="100%" alignItems={'flex-start'} borderRadius={'8px'} border={'1px solid #E2E8F0'}>
						<Box w="50%">
							<Flex className={styles.resultTips} direction="column">
								<Alert status='info' flexShrink={0} p={'10px'} borderRadius="10px" bg="#EAF1FF">

									<Box>
										<AlertTitle color={'#212529'} fontSize={'16px'} fontWeight="600">Not getting correct response?</AlertTitle>
										<AlertDescription fontSize="14px" color="#6C757D">
											It is all about the training data. Here are some ways to improve the accuracy of your Bot.
										</AlertDescription>
									</Box>
								</Alert>
								<Box className={styles.resultTip}>
									<Box className={styles.resultTipNumber} > 1</Box>
									<Heading className={styles.resultTipHeading} fontSize="medium">Add More Training Data</Heading>
									<Text className={styles.resultTipDescg}>The more data you add, the better the bot response will be. You can add custom data to train in the form of question-answer pairs from the <Text as="span" cursor="pointer" textDecoration="underline" onClick={() => {
										// goToStep("train-custom-data");
										history.push(`/app/edit-bot/${chatBot._id}?tab=custom-FAQ-data`)

									}}>
										{/* Train custom data */}
										Custom FAQ Data
									</Text> section. </Text>
								</Box>

								<Box className={styles.resultTip}>
									<Box className={styles.resultTipNumber} > 2</Box>
									<Heading className={styles.resultTipHeading} fontSize="medium">Ensure Correct Crawling of Website Pages.</Heading>
									<Text className={styles.resultTipDescg}>Verify that all the necessary pages on your website are crawled correctly. To do this, head to the <Text as="span" cursor="pointer" textDecoration="underline" onClick={() => {
										// goToStep("product-setup");
										history.push(`/app/vakmangids-chatbot/${chatBot._id}?tab=scrape-website-data`)

									}}>
										{/* Data sources */}
										Scrape Website Data
									</Text> tab and click on the "View Crawled Data" button. </Text>
								</Box>
								<Box className={styles.resultTip}>
									<Box className={styles.resultTipNumber} > 3</Box>
									<Heading className={styles.resultTipHeading} fontSize="medium">Train bot with Previous Support Questions</Heading>
									<Text className={styles.resultTipDescg}>To reduce the number of repetitive emails and inquiries, make sure to train your ChatBot with past support questions and answers. </Text>
								</Box>
								<Box className={styles.resultTip}>
									<Box className={styles.resultTipNumber} > 4</Box>
									<Heading className={styles.resultTipHeading} fontSize="medium">Contact Us</Heading>
									<Text className={styles.resultTipDescg}>Still not statisfied? Email us at <a href="mailto:support@ultimabot.ai" style={{ textDecoration: 'underline' }}>support@ultimabot.ai</a>. We'll help you with the setup. </Text>
								</Box>
							</Flex>
						</Box>
						<Box w="50%" pos="relative" p={'24px'} h="100%">
							<ChatBot knowledgeBaseId={chatBot._id} customStyle={chatBot.chatWidgeData} defaultMessageNumber={0} />
						</Box>
					</HStack>
				</Flex>
			</>
		);
	}, [chatBot._id, chatBot.websiteData?.websiteUrl, chatBot.customDomain, chatBot.chatWidgeData, currentStep, handleLeads, getCrawlDataPagination, getDocsDataPagination, getExcludedPaths, getIncludedPaths, handleTabChange, defaultCrauledData, isSubmitting, isUploadingDocs, docsDataLoading, docsData, crawlDataLoading, productSetupLoadingText, primaryButtonLabel, getDefaultCustomizationValues, getAddToWebsiteContent, props.match.params.chatbotId, handleTrainingDataSave, getCustomDataComponent, isChatLoading, leads, offlineMessages, handleOfflinePageClick, history, handleChatbotUpdate, toast, goToStep]);

	const getEmbedErrorComponent = React.useCallback(() => {
		if (!isEmbedError) return null;
		return <Alert status='warning'>
			<AlertIcon />
			Unable to create chatbot. Please try again or contact support
		</Alert>
	}, [isEmbedError]);

	const handleTabChanges = (index: number) => {
		const steps = [
			"scrape-website-data",
			'leads',
			'chat-sessions',
			'offline-messages',
			'custom-prompt',
			'add-to-site',
			'chatbot',
			"settings",
			'custom-domain'
		];
		const newStep: any = steps[index];
		setCurrentStep(newStep);
		// Update URL with the new tab
		history.push(`?tab=${newStep}`);
	};

	const onMenuItemClick = React.useCallback(
		async (type, chatbot) => {
			if (type === "delete") {
				await deleteKnowledgebase(chatbot._id as string);
				toast({
					title: `Project has been deleted successfully`,
					status: "success",
					isClosable: true,
				});
				history.push('/app/bots'); // Navigate to /app after deletion
			}
		},
		[history]
	);
	const handleDeletes = () => {
		setIsDeleteDialogOpens(true);
	};
	const handleCancelDeletes = () => {
		setIsDeleteDialogOpens(false);
	};

	const handleConfirmDeletes = () => {
		setIsDeleteDialogOpens(false);
		onMenuItemClick("delete", chatBot);
	};
	const handleCancelDelete = () => {
		setIsDeleteDialogOpen(false);
	};

	return (
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
			<VStack w="100%" spacing="10">
				<Box w="100%">
					{Object.keys(chatBot).length > 0 && <Box>
						<Text as="span" fontSize="16px" fontWeight="400"><Link to="/app/chatbots">
							<Text as="span" color="#2977FF" textDecoration="underline">ChatBot</Text></Link>  / <Text as="span" color="#6C757D">
								{typeof chatBot.name === "string"
									? `${chatBot.name.split('.')[0]}`
									: null}
							</Text></Text>
					</Box>}
					<Box mt="24px" mb="24px">
						{/* <Heading fontSize="30" color="#1A202C">{chatBot.name}</Heading> */}
						<Flex w="100%" justifyContent="space-between" alignItems={"center"}>
							<Box>
								<Heading fontSize="24px" color="#1A202C"
									style={{ textTransform: "capitalize" }}>
									{typeof chatBot.name === "string"
										? `${chatBot.name.split('.')[0]}`
										: null}</Heading>
							</Box>
							{Object.keys(chatBot).length > 0 && <Flex>
								<Flex fontSize="12px" fontWeight="400" pr={"12px"} py={"10px"}><Text as="span" color="#524D4D">Last Crawled:</Text>&nbsp;{chatBot.updatedAt !== undefined ? <LastCrawledFormate date={chatBot.updatedAt} /> : null} </Flex>
								{chatBot.chatbotType !== "vakmangids" && <Button colorScheme="red" marginRight="12px" onClick={handleDeletes} >
									<svg width="16" height="100%" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M4.5 5.5C4.63261 5.5 4.75979 5.55268 4.85355 5.64645C4.94732 5.74021 5 5.86739 5 6V12C5 12.1326 4.94732 12.2598 4.85355 12.3536C4.75979 12.4473 4.63261 12.5 4.5 12.5C4.36739 12.5 4.24021 12.4473 4.14645 12.3536C4.05268 12.2598 4 12.1326 4 12V6C4 5.86739 4.05268 5.74021 4.14645 5.64645C4.24021 5.55268 4.36739 5.5 4.5 5.5ZM7 5.5C7.13261 5.5 7.25979 5.55268 7.35355 5.64645C7.44732 5.74021 7.5 5.86739 7.5 6V12C7.5 12.1326 7.44732 12.2598 7.35355 12.3536C7.25979 12.4473 7.13261 12.5 7 12.5C6.86739 12.5 6.74021 12.4473 6.64645 12.3536C6.55268 12.2598 6.5 12.1326 6.5 12V6C6.5 5.86739 6.55268 5.74021 6.64645 5.64645C6.74021 5.55268 6.86739 5.5 7 5.5ZM10 6C10 5.86739 9.94732 5.74021 9.85355 5.64645C9.75979 5.55268 9.63261 5.5 9.5 5.5C9.36739 5.5 9.24021 5.55268 9.14645 5.64645C9.05268 5.74021 9 5.86739 9 6V12C9 12.1326 9.05268 12.2598 9.14645 12.3536C9.24021 12.4473 9.36739 12.5 9.5 12.5C9.63261 12.5 9.75979 12.4473 9.85355 12.3536C9.94732 12.2598 10 12.1326 10 12V6Z" fill="#fff" />
										<path fill-rule="evenodd" clip-rule="evenodd" d="M13.5 3C13.5 3.26522 13.3946 3.51957 13.2071 3.70711C13.0196 3.89464 12.7652 4 12.5 4H12V13C12 13.5304 11.7893 14.0391 11.4142 14.4142C11.0391 14.7893 10.5304 15 10 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4H1.5C1.23478 4 0.98043 3.89464 0.792893 3.70711C0.605357 3.51957 0.5 3.26522 0.5 3V2C0.5 1.73478 0.605357 1.48043 0.792893 1.29289C0.98043 1.10536 1.23478 1 1.5 1H5C5 0.734784 5.10536 0.48043 5.29289 0.292893C5.48043 0.105357 5.73478 0 6 0H8C8.26522 0 8.51957 0.105357 8.70711 0.292893C8.89464 0.48043 9 0.734784 9 1H12.5C12.7652 1 13.0196 1.10536 13.2071 1.29289C13.3946 1.48043 13.5 1.73478 13.5 2V3ZM3.118 4L3 4.059V13C3 13.2652 3.10536 13.5196 3.29289 13.7071C3.48043 13.8946 3.73478 14 4 14H10C10.2652 14 10.5196 13.8946 10.7071 13.7071C10.8946 13.5196 11 13.2652 11 13V4.059L10.882 4H3.118ZM1.5 3V2H12.5V3H1.5Z" fill="#fff" />
									</svg>
								</Button>}

							</Flex>}
						</Flex>
					</Box>
					{chatBot.chatbotType === "vakmangids" && <Box mt="25px" mb="25px">
						<Flex w="100%">
							<Input
								w={"400px"}
								borderColor={'#a6a4a4'}
								background={"#fff"}

								type="text"
								mr="10px"
								ref={urlInputRef}
								defaultValue={chatBot?.websiteData?.websiteUrl}
							/>
							<Button colorScheme="blue" fontWeight={500}
								variant="solid" isLoading={isFetchingKBId} onClick={handleUrlButtonClick}>Go</Button>
						</Flex>
					</Box>}
				</Box>
				<Box width="100%" style={{ marginTop: "0px" }}>
					<Tabs variant="enclosed" w="100%" colorScheme='gray' size="md" onChange={handleTabChanges}
						index={
							['scrape-website-data', 'leads', 'chat-sessions', 'offline-messages', 'custom-prompt', 'add-to-site', 'chatbot', "settings", 'custom-domain'].indexOf(currentStep)
						}
					>
						<TabList>

							<Tab
								id="tab-3"
								isDisabled={isSubmitting}
								_focus={{ outline: "none" }}
								_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
								style={{
									backgroundColor: currentStep === "scrape-website-data" ? '#fff' : '',
									color: currentStep === "scrape-website-data" ? '#495057' : '#2977FF',
									fontSize: '16px'
								}}
								onClick={() => setCurrentStep("scrape-website-data")}
							>
								{/* Data Sources */}
								Scrape Website Data
							</Tab>

							<Tab
								id="tab-0"
								isDisabled={isSubmitting}
								_focus={{ outline: "none" }}
								_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
								style={{
									backgroundColor: currentStep === "leads" ? '#fff' : '',
									color: currentStep === "leads" ? '#495057' : '#2977FF',
									fontSize: '16px',
								}}
								onClick={() => {
									setCurrentStep("leads")
								}}
							>
								Leads
							</Tab>
							<Tab
								id="tab-1"
								isDisabled={isSubmitting}
								_focus={{ outline: "none" }}
								_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
								style={{
									backgroundColor: currentStep === "chat-sessions" ? '#fff' : '',
									color: currentStep === "chat-sessions" ? '#495057' : '#2977FF',
									fontSize: '16px',
								}}
								onClick={() => {
									history.push(`/app/vakmangids-chatbot/${chatBot._id}/?tab=chat-sessions`)
									setCurrentStep("chat-sessions")
								}}
							>
								Chat Sessions
							</Tab>
							<Tab
								id="tab-2"
								isDisabled={isSubmitting}
								_focus={{ outline: "none" }}
								_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
								style={{
									backgroundColor: currentStep === "offline-messages" ? '#fff' : '',
									color: currentStep === "offline-messages" ? '#495057' : '#2977FF',
									fontSize: '16px',
								}}
								onClick={() => setCurrentStep("offline-messages")}
							>
								Offline Messages
							</Tab>

							<Tab
								id="tab-5"
								isDisabled={isSubmitting}
								_focus={{ outline: "none" }}
								_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
								style={{
									backgroundColor: currentStep === "custom-prompt" ? '#fff' : '',
									color: currentStep === "custom-prompt" ? '#495057' : '#2977FF',
									fontSize: '16px',
								}}
								onClick={() => setCurrentStep("custom-prompt")}
							>
								Custom Prompt
							</Tab>

							<Tab
								id="tab-6"
								isDisabled={isSubmitting}
								_focus={{ outline: "none" }}
								_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
								style={{
									backgroundColor: currentStep === "add-to-site" ? '#fff' : '',
									color: currentStep === "add-to-site" ? '#495057' : '#2977FF',
									fontSize: '16px',
								}}
								onClick={() => setCurrentStep("add-to-site")}
							>
								Add to Site
							</Tab>
							<Tab
								id="tab-7"
								isDisabled={isSubmitting}
								_focus={{ outline: "none" }}
								_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
								style={{
									backgroundColor: currentStep === "chatbot" ? '#fff' : '',
									color: currentStep === "chatbot" ? '#495057' : '#2977FF',
									fontSize: '16px',
								}}
								onClick={() => setCurrentStep("chatbot")}
							>
								Try Bot
							</Tab>

							<Tab
								id="tab-8"
								isDisabled={isSubmitting}
								_focus={{ outline: "none" }}
								_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
								style={{
									backgroundColor: currentStep === "settings" ? '#fff' : '',
									color: currentStep === "settings" ? '#495057' : '#2977FF',
									fontSize: '16px',
								}}
								onClick={() => setCurrentStep("settings")}
							>
								Settings
							</Tab>
						</TabList>
						<TabPanels border="1px solid #DEE2E6" bg="#fff">
							{
								chatBot.chatbotType === "vakmangids" &&
								<TabPanel p="0" >
									{/* Replace with content for Data Sources */}
									{getMainComponent()}
								</TabPanel>
							}
							<TabPanel p="5">
								{getMainComponent()}
								{/* Replace with content for Custom Prompt */}
							</TabPanel>
							<TabPanel p="5">
								{getMainComponent()}
								{/* Replace with content for Chat Sessions */}
							</TabPanel>
							<TabPanel p="5">
								{getMainComponent()}
								{/* Replace with content for Offline Messages */}
							</TabPanel>

							<TabPanel p="5">
								{getMainComponent()}
								{/* Replace with content for Add To Site */}
							</TabPanel>
							<TabPanel p="5">
								{getMainComponent()}
								{/* Replace with content for Try ChatBot */}
							</TabPanel>
							<TabPanel p="5">
								{getMainComponent()}
								{/* Replace with content for Try ChatBot */}
							</TabPanel>
							{/* <TabPanel p="5">
								<KnowledgeBase kbId={chatBot._id} />
							</TabPanel> */}
							<TabPanel p="5">
								{getMainComponent()}
							</TabPanel>
						</TabPanels>
					</Tabs>
				</Box>
				{/* {getMainComponent()} */}
			</VStack >
			<AlertDialog
				isOpen={isDeleteDialogOpen}
				leastDestructiveRef={cancelRef}
				onClose={handleCancelDelete}
			>
				<AlertDialogOverlay>
					<AlertDialogContent>
						<AlertDialogHeader fontSize='lg' fontWeight='bold'>
							Delete CustomData
						</AlertDialogHeader>

						<AlertDialogBody>
							Are you sure? You can't undo this action afterwards.
						</AlertDialogBody>

						<AlertDialogFooter>
							<Button size="sm" fontWeight={"500"} ref={cancelRef} onClick={handleCancelDelete}>
								Cancel
							</Button>
							<Button size="sm" fontWeight={"500"} colorScheme='red'
								onClick={() => {
									handleQuestionDelete()
								}}
								ml={3}>
								Delete
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialogOverlay>
			</AlertDialog>
			<AlertDialog
				isOpen={isDeleteDialogOpens}
				leastDestructiveRef={cancelRef}
				onClose={handleCancelDeletes}
			>
				<AlertDialogOverlay>
					<AlertDialogContent>
						<AlertDialogHeader fontSize="lg" fontWeight="bold">
							Delete bot?
						</AlertDialogHeader>
						<AlertDialogBody>
							{/* You can't undo this action afterwards. */}
							Are you sure you want to delete this project? This action is irreversible and will permanently remove all associated data, including knowledge base records, leads, campaigns, and embedding chunks.

						</AlertDialogBody>
						<AlertDialogFooter>
							<Button ref={cancelRef} fontWeight={"500"} size='sm' onClick={handleCancelDeletes}>
								Cancel
							</Button>
							<Button
								size="sm"
								colorScheme="red"
								variant="solid"
								fontWeight={"500"}
								onClick={handleConfirmDeletes}
								ml={3}>
								Delete
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialogOverlay>
			</AlertDialog>
		</Box >
	);
};
export default withRouter(VekmangidsChatbot);
