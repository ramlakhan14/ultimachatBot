import * as React from "react";
import {
	HStack,
	Button,
	VStack,
	FormControl,
	FormErrorMessage,
	FormLabel,
	Input,
	FormHelperText,
	Box,
	Flex,
	AlertIcon,
	Alert,
	Text,
	Table,
	TableContainer,
	Tbody,
	Td,
	Th,
	Thead,
	Tr,
	Spinner,

	useDisclosure,
	Tabs,
	TabList,
	Tab,
	TabPanels,
	TabPanel,
	IconButton,
	Heading,
	useToast,
	Textarea,
	ButtonGroup,
	Switch,
	Tooltip,
	Icon,
	Popover,
	PopoverTrigger,
	PopoverContent,
	PopoverArrow,
} from "@chakra-ui/react";


import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	ModalCloseButton,
} from '@chakra-ui/react'

import classNames from 'classnames';

import { useEffect, useRef } from "react";
import { Formik, Form, Field } from "formik";

import styles from './ChatBotProductSetup.module.scss'
import { getDomainFromUrl } from "../../utils/commonUtils";
import { fetchKnowledgebaseCrawlDataDetails, deleteTrainingData, updateEnabledStatus } from "../../services/knowledgebaseService";
import { CrawlData, WebsiteData, ProductSetupData, DocsKnowledgeData } from "../../types/knowledgebase.type";
import ReactMarkdown from "react-markdown";
import { Paginator } from "../../widgets/Paginator/Paginator";
import { SectionTitle } from "../../components/SectionTitle/SectionTitle";
import CustomDropzone from "../../components/FileDropzone/CustomDropzone";
import { RiDeleteBin5Line } from "react-icons/ri";
import { NoDataFineTuneIcon } from "../../components/Icons/noData/NoDataFineTuneIcon";
import { url } from "inspector";
import { CurrentUser } from "../../services/appConfig";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import TableComponent from "../TableComponent";
import { GoInfo } from "react-icons/go";
import { useLocation } from "react-router-dom";

interface FormValues {
	websiteUrl: string;
	target?: any;
	isChatbotEnabled: boolean;
	isChatbotEnabledinner: boolean;
	exclude?: any;
	files: File[];
}
interface ChatBotProductSetupProps {
	onPrimaryBtnClick: (finalFormValues: ProductSetupData, hasWebsiteDataChanged: boolean) => void;
	onSecondaryBtnClick: (finalFormValues: ProductSetupData, hasWebsiteDataChanged: boolean) => void;
	onCrawlDataPaginationClick: (pageNo: number) => void;
	onDocsDataPaginationClick: (pageNo: number) => void;
	onTabsChange: (tabIndex: number) => void;
	primaryButtonLabel?: string;
	secondaryBtnLabel?: string;
	showSecondaryButton?: boolean;
	defualtChatbotEnabled?: boolean;
	defaultExcludedPaths?: string[];
	defaultIncludedPaths?: string[];
	defaultProductDescription?: string;
	defaultWebsite?: string;
	showDescription?: boolean;
	crawlDataLoading?: boolean;
	getCrawlDataPagination: any;
	defaultCrauledData: CrawlData;
	defaultFiles?: File[];
	disableTabs: boolean;
	isSubmitting?: boolean;
	isUploadingDocs?: boolean;
	isSecondaryBtnSubmitting?: boolean;
	disableWebsiteInput?: boolean;
	loadingText?: string;
	disableSubmitBtnByDefault?: boolean;
	docsData?: DocsKnowledgeData;
	docsDataLoading?: boolean;
	chatbotType?: string;
	paddingUsed?: string;
}

// function validateWebsite(value: string) {
// 	let error;
// 	if (value &&
// 		!/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,10}\b([-a-zA-Z0-9@:%_\+.~#()?&//=]*)/gim.test(
// 			value
// 		)
// 	) {
// 		error = "Invalid website URL";
// 	}

// 	return error;
// }

function validateWebsite(value: string) {
	let error;

	if (value) {
		const urlRegex =
			/^(https?:\/\/|www\.)(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(\/.*)?$/;

		if (!urlRegex.test(value)) {
			error =
				"URL must start with www. or http(s):// and be a valid domain (e.g. https://example.com or https://sub.example.com)";
		}
	}

	return error;
}

export const ChatBotProductSetup = ({
	onPrimaryBtnClick,
	onSecondaryBtnClick,
	onCrawlDataPaginationClick,
	onDocsDataPaginationClick,
	onTabsChange,
	crawlDataLoading,
	defaultWebsite = "",
	defualtChatbotEnabled = false,
	primaryButtonLabel = "Create Project",
	secondaryBtnLabel = "Go Back",
	showSecondaryButton = false,
	disableSubmitBtnByDefault = false,
	defaultCrauledData,
	defaultExcludedPaths,
	defaultIncludedPaths,
	getCrawlDataPagination,
	defaultFiles = [],
	disableWebsiteInput = false,
	loadingText = '',
	isSubmitting = false,
	disableTabs = false,
	isUploadingDocs = false,
	isSecondaryBtnSubmitting = false,
	docsDataLoading = false,
	docsData,
	chatbotType,
	paddingUsed
}: ChatBotProductSetupProps) => {


	const customDropzoneRef = useRef<any>(null);
	const toast = useToast();

	const { isOpen, onOpen, onClose } = useDisclosure()

	const [crauledData, setCrauledData] = React.useState<any>(defaultCrauledData as unknown as CrawlData);

	const [crauledDataDetail, setCrauledDataDetail] = React.useState<string>(defaultCrauledData as unknown as string)
	const [isChatbotEnabled, setIsChatbotEnabled] = React.useState(defualtChatbotEnabled || false);

	const [deleteDocLoading, setDeleteDocLoading] = React.useState<boolean>(false);
	const [localDocsData, setLocalDocsData] = React.useState<DocsKnowledgeData>(docsData as unknown as DocsKnowledgeData);
	const [docToDelete, setDocToDelete] = React.useState<string>('0');
	const [selectedTab, setSelectedTab] = React.useState<number>(0);
	const [isOpens, setIsOpens] = React.useState(false);
	const [isUpdate, setIsupdate] = React.useState(false); // isupdate state
	const [forcePage, setForcePage] = React.useState<number>(0);
	const [includedPathOpen, setIncludedPathOpen] = React.useState<boolean>(false);
	const [excludedPathOpen, setExcludedPathOpen] = React.useState<boolean>(false);
	const onCloses = () => {
		setIsOpens(false);
	};
	useEffect(() => {
		setLocalDocsData(docsData as unknown as DocsKnowledgeData);
	}, [docsData]);

	useEffect(() => {
		setCrauledData(defaultCrauledData);
	}, [defaultCrauledData]);

	const yesUpdate = () => {
		setIsupdate(true)
	};
	const [payLoad, setPayLoad] = React.useState<ProductSetupData | null>(null);
	const [hasWebsiteDataChanged, setHasWebsiteDataChanged] = React.useState(false);
	const location = useLocation()
	// console.log("docsData", location?.pathname)
	// useEffect to trigger when isupdate changes
	React.useEffect(() => {

		if (isUpdate === true && payLoad) { // Ensure payLoad is defined
			onPrimaryBtnClick(payLoad, hasWebsiteDataChanged);
			setIsOpens(false);
			setIsupdate(false);
		}
	}, [isUpdate, payLoad, hasWebsiteDataChanged]); // Depend on payLoad and hasWebsiteDataChanged

	const onNextButtonClick = React.useCallback(
		async ({ websiteUrl, target, exclude, files }: FormValues, type) => {
			const formValues: FormValues = {} as FormValues;
			formValues.websiteUrl = websiteUrl;
			// formValues.isChatbotEnabled = isChatbotEnabled;

			let targetPaths = (target || '').split(',')
			// filter out empty paths and trim white spaces
			targetPaths = targetPaths.filter((path: any) => !!path).map((path: any) => path.trim());

			// targetPaths = targetPaths.map((path) => {
			// 	return (website.endsWith('/') ? website.slice(0, -1) : website) + path + '/**/*';
			// });

			let excludePaths = (exclude || '').split(',')
			// filter out empty paths and trim white spaces
			excludePaths = excludePaths.filter((path: any) => !!path).map((path: any) => path.trim())

			// excludePaths = excludePaths.map((path) => {
			// 	return (website.endsWith('/') ? website.slice(0, -1) : website) + path + '!/**/*';
			// });
			let chatbotName = '';
			if (websiteUrl) {
				chatbotName = getDomainFromUrl(websiteUrl);
			} else if (files.length) {
				chatbotName = files[0].name;
			}
			const websiteData: WebsiteData = {
				name: chatbotName,
				websiteUrl: websiteUrl,
				urls: [],
				include: targetPaths,
				exclude: excludePaths,
				isChatbotEnabled: isChatbotEnabled || false,
			}

			const payLoad: ProductSetupData = {
				websiteData: websiteData,
				files: files
			}
			if (customDropzoneRef.current) {
				customDropzoneRef.current.clearFiles();
			}
			// formValues.targetPagesBar = [...includedTarget, ...excludedTarget];
			// if((!formValues.targetPagesBar || !formValues.targetPagesBar.length) && target) {
			// 	formValues.targetPagesBar = [{ action: "include", path: target }]
			// }

			const hasWebsiteDataChanged = (defaultWebsite !== websiteUrl ||
				defaultIncludedPaths !== targetPaths.join(',') ||
				defaultExcludedPaths !== excludePaths.join(',')) ? true : false;

			// Update state for payLoad and change status
			setPayLoad(payLoad);
			setHasWebsiteDataChanged(hasWebsiteDataChanged);
			const userRole = CurrentUser.get();

			if (type === 'primary') {
				if (primaryButtonLabel === "Update Data" || primaryButtonLabel === "Update Website Data" || primaryButtonLabel === "Crawl Again & Save") {
					setIsOpens(true);
				}
				else {
					onPrimaryBtnClick(payLoad, hasWebsiteDataChanged);
				}
			} else {
				onSecondaryBtnClick(payLoad, hasWebsiteDataChanged);
			}
			// }

		},
		[defaultWebsite, defaultIncludedPaths, defaultExcludedPaths, isChatbotEnabled, onPrimaryBtnClick, onSecondaryBtnClick]
	);


	const handlePageClick = React.useCallback((page) => {
		onCrawlDataPaginationClick(page + 1);
		setForcePage(page)
	}, [onCrawlDataPaginationClick]);

	const handleDocsPageClick = React.useCallback((page) => {
		onDocsDataPaginationClick(page + 1);
	}, [onDocsDataPaginationClick]);

	const [crawlDatLoading, setCrawlDatLoading] = React.useState<string>('');

	const handleURLClick = React.useCallback(async (knowledgebaseId, crawlDataId) => {

		setCrawlDatLoading(crawlDataId);
		const resposne = await fetchKnowledgebaseCrawlDataDetails(knowledgebaseId, crawlDataId);
		setCrauledDataDetail(resposne.data?.content);
		setCrawlDatLoading('');
		onOpen();

	}, [onOpen]);

	const handleDocDelete = React.useCallback(async (knowledgeBaseId, docId) => {
		const userRole = CurrentUser.get();
		setDeleteDocLoading(true);
		try {
			await deleteTrainingData(knowledgeBaseId, docId);
			const updatedResults = localDocsData?.docs.filter((data) => data._id !== docId);

			toast({
				title: `Document has been deleted successfully `,
				status: "success",
				isClosable: true,
			});
			// crawlDataLoading = false

		} catch (error: any) {
			toast({
				title: error?.response?.data?.message || error?.message || `Oops! unable to delete the document`,
				status: "error",
				isClosable: true,
			});
		} finally {
			// window.location.reload();
			setForcePage(0);
			getCrawlDataPagination(1)
			setDeleteDocLoading(false);
			setDocToDelete('0');
		}
		// }
	}, [localDocsData, toast]);

	const handleStatusUpdate = React.useCallback(async (vlu: any) => {
		try {
			if (!docsData) {
				toast({
					title: "Documentation data is not available",
					status: "error",
					isClosable: true,
				});
				return;
			}
			const response: any = await updateEnabledStatus(docsData.knowledgebaseId, vlu);
			// console.log("clickec item s", vlu, response);
			// fetchChatbots(currentPage, vlu);
			toast({
				title: `Bot status has been updated successfully `,
				status: "success",
				isClosable: true,
			});

		}
		catch (error: any) {
			toast({
				title: error?.response?.data?.message || error?.message || "Server Error",
				status: "error",
				isClosable: true,
			});
			// console.log("error ",
			// 	error
			// );

			// Handle error
		}
	}, [docsData, toast]);



	const getCrauledPaths = React.useCallback(() => {
		if (isSubmitting) {
			return <>
				<VStack alignItems="center" w="100%" mb="6" mt="30px">
					<VStack w="100%">
						<Flex direction="column" justifyContent="center" alignItems="center" borderRadius="md" border="1px solid" borderColor="gray.200" w="100%" p="12">
							<Spinner color='gray.700' mb="4" />
							<Text color="gray.500">
								{loadingText}
							</Text>
						</Flex>
					</VStack>
				</VStack>
			</>
		}
		if (crauledData) {
			const totalPages = crauledData?.stats?.crawledPages + crauledData?.stats?.failedPages;
			const crawledPercentage = (crauledData?.stats?.crawledPages * 100) / totalPages;
			const failedPercentage = (crauledData?.stats?.failedPages * 100) / totalPages;
			return <>


				<Box>
					<Box position="relative">
						{crawlDataLoading ? <Box className={styles.crawlDataLoading}><Spinner color='gray.700' size="xs" /></Box> : ''}
						<Text as="p" fontSize="14px" mt={"24px"} fontWeight="600" color="#6C757D" mb="24px">CRAWLED DATA</Text>
						<TableComponent
							data={crauledData?.urls || []}
							tableHeader={[]}
							customRowRenderer={(url: any, index: number) => {
								return (
									<Tr key={url._id} >
										<Td className={classNames(styles.urls, {
											[styles.firstUrl]: index === 0,
										})} maxW="400px" overflow="hidden" whiteSpace="nowrap" cursor={"default"} textOverflow="ellipsis">
											<Box maxWidth="85%"
												sx={{
													cursor: "text",
												}}
												whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
												<svg width="16" height="16" style={{ display: "inline", margin: "0px 8px -3px 8px" }} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M0 8C0 5.87827 0.842855 3.84344 2.34315 2.34315C3.84344 0.842855 5.87827 0 8 0C10.1217 0 12.1566 0.842855 13.6569 2.34315C15.1571 3.84344 16 5.87827 16 8C16 10.1217 15.1571 12.1566 13.6569 13.6569C12.1566 15.1571 10.1217 16 8 16C5.87827 16 3.84344 15.1571 2.34315 13.6569C0.842855 12.1566 0 10.1217 0 8ZM7.5 1.077C6.83 1.281 6.165 1.897 5.613 2.932C5.43113 3.2761 5.27471 3.63305 5.145 4H7.5V1.077ZM4.09 4C4.25667 3.46882 4.47087 2.95373 4.73 2.461C4.90291 2.13406 5.10259 1.82199 5.327 1.528C4.088 2.04183 3.02201 2.89962 2.255 4H4.09ZM3.508 7.5C3.538 6.623 3.646 5.782 3.82 5H1.674C1.30112 5.78505 1.07861 6.63301 1.018 7.5H3.508ZM4.847 5C4.65032 5.8198 4.53707 6.6574 4.509 7.5H7.5V5H4.847ZM8.5 5V7.5H11.49C11.4623 6.65743 11.3494 5.81983 11.153 5H8.5ZM4.51 8.5C4.53774 9.34257 4.65065 10.1802 4.847 11H7.5V8.5H4.51ZM8.5 8.5V11H11.153C11.34 10.235 11.459 9.392 11.491 8.5H8.5ZM5.145 12C5.283 12.386 5.44 12.744 5.613 13.068C6.165 14.103 6.831 14.718 7.5 14.923V12H5.145ZM5.327 14.472C5.10257 14.178 4.90289 13.866 4.73 13.539C4.47088 13.0463 4.25668 12.5312 4.09 12H2.255C3.02196 13.1004 4.08797 13.9582 5.327 14.472ZM3.82 11C3.63916 10.1781 3.53472 9.34117 3.508 8.5H1.018C1.08 9.39 1.309 10.233 1.674 11H3.82ZM10.673 14.472C11.912 13.9582 12.978 13.1004 13.745 12H11.91C11.7433 12.5312 11.5291 13.0463 11.27 13.539C11.0971 13.866 10.8975 14.178 10.673 14.472ZM8.5 12V14.923C9.17 14.719 9.835 14.103 10.387 13.068C10.56 12.744 10.717 12.386 10.855 12H8.5ZM12.18 11H14.326C14.691 10.233 14.92 9.39 14.982 8.5H12.492C12.4653 9.34117 12.3608 10.1781 12.18 11ZM14.982 7.5C14.9214 6.63301 14.6989 5.78506 14.326 5H12.18C12.354 5.782 12.462 6.623 12.492 7.5H14.982ZM11.27 2.461C11.517 2.925 11.732 3.441 11.91 4H13.745C12.978 2.89958 11.912 2.04178 10.673 1.528C10.891 1.812 11.091 2.126 11.27 2.461ZM10.855 4C10.7253 3.63305 10.5689 3.27609 10.387 2.932C9.835 1.897 9.17 1.282 8.5 1.077V4H10.855Z" fill="#6C757D" />
												</svg>{url.url}</Box>
											{crawlDatLoading === url._id ?
												<Box className={styles.urlSpinner}><Spinner color='gray.700' size="xs" /></Box> : ''}

											<Button className={styles.urlBtn} colorScheme='#fff' size='xs' mr={`${chatbotType === "vakmangids" ? "0px" : "34px"}`}
												onClick={() => {
													handleURLClick(crauledData?.knowledgebaseId, url._id)
												}}>
												<svg width="16px" height="16px" viewBox="0 0 16 16" fill="none" >
													<g clip-path="url(#clip0_1003_1703)">
														<path d="M15.9998 7.99915C15.9998 7.99915 12.9998 2.49915 7.99976 2.49915C2.99976 2.49915 -0.000244141 7.99915 -0.000244141 7.99915C-0.000244141 7.99915 2.99976 13.4991 7.99976 13.4991C12.9998 13.4991 15.9998 7.99915 15.9998 7.99915ZM1.17276 7.99915C1.65627 7.26427 2.2124 6.57983 2.83276 5.95615C4.11976 4.66715 5.87976 3.49915 7.99976 3.49915C10.1198 3.49915 11.8788 4.66715 13.1678 5.95615C13.7881 6.57983 14.3442 7.26427 14.8278 7.99915C14.7698 8.08615 14.7058 8.18215 14.6328 8.28715C14.2978 8.76715 13.8028 9.40715 13.1678 10.0421C11.8788 11.3311 10.1188 12.4991 7.99976 12.4991C5.87976 12.4991 4.12076 11.3311 2.83176 10.0421C2.2114 9.41846 1.65628 8.73402 1.17276 7.99915Z" fill="#6C757D" />
														<path d="M7.99976 5.49915C7.33671 5.49915 6.70083 5.76254 6.23199 6.23138C5.76315 6.70022 5.49976 7.3361 5.49976 7.99915C5.49976 8.66219 5.76315 9.29807 6.23199 9.76691C6.70083 10.2358 7.33671 10.4991 7.99976 10.4991C8.6628 10.4991 9.29868 10.2358 9.76752 9.76691C10.2364 9.29807 10.4998 8.66219 10.4998 7.99915C10.4998 7.3361 10.2364 6.70022 9.76752 6.23138C9.29868 5.76254 8.6628 5.49915 7.99976 5.49915ZM4.49976 7.99915C4.49976 7.07089 4.86851 6.18065 5.52488 5.52427C6.18126 4.86789 7.0715 4.49915 7.99976 4.49915C8.92801 4.49915 9.81825 4.86789 10.4746 5.52427C11.131 6.18065 11.4998 7.07089 11.4998 7.99915C11.4998 8.9274 11.131 9.81764 10.4746 10.474C9.81825 11.1304 8.92801 11.4991 7.99976 11.4991C7.0715 11.4991 6.18126 11.1304 5.52488 10.474C4.86851 9.81764 4.49976 8.9274 4.49976 7.99915Z" fill="#6C757D" />
													</g>
													<defs>
														<clipPath id="clip0_1003_1703">
															<rect width="16" height="16" fill="white" />
														</clipPath>
													</defs>
												</svg>
											</Button>
											{chatbotType !== "vakmangids" && <Button className={styles.urlBtn} colorScheme='#fff' size='xs'
												onClick={() => {
													setDocToDelete(url._id);
													handleDocDelete(crauledData.knowledgebaseId, url._id)
												}}
											>
												<svg width="16px" height="16px" viewBox="0 0 16 16" fill="none" >
													<g clip-path="url(#clip0_1003_1720)">
														<path d="M5.49976 5.49915C5.63236 5.49915 5.75954 5.55182 5.85331 5.64559C5.94708 5.73936 5.99976 5.86654 5.99976 5.99915V11.9991C5.99976 12.1318 5.94708 12.2589 5.85331 12.3527C5.75954 12.4465 5.63236 12.4991 5.49976 12.4991C5.36715 12.4991 5.23997 12.4465 5.1462 12.3527C5.05243 12.2589 4.99976 12.1318 4.99976 11.9991V5.99915C4.99976 5.86654 5.05243 5.73936 5.1462 5.64559C5.23997 5.55182 5.36715 5.49915 5.49976 5.49915ZM7.99976 5.49915C8.13236 5.49915 8.25954 5.55182 8.35331 5.64559C8.44708 5.73936 8.49976 5.86654 8.49976 5.99915V11.9991C8.49976 12.1318 8.44708 12.2589 8.35331 12.3527C8.25954 12.4465 8.13236 12.4991 7.99976 12.4991C7.86715 12.4991 7.73997 12.4465 7.6462 12.3527C7.55243 12.2589 7.49976 12.1318 7.49976 11.9991V5.99915C7.49976 5.86654 7.55243 5.73936 7.6462 5.64559C7.73997 5.55182 7.86715 5.49915 7.99976 5.49915ZM10.9998 5.99915C10.9998 5.86654 10.9471 5.73936 10.8533 5.64559C10.7595 5.55182 10.6324 5.49915 10.4998 5.49915C10.3671 5.49915 10.24 5.55182 10.1462 5.64559C10.0524 5.73936 9.99976 5.86654 9.99976 5.99915V11.9991C9.99976 12.1318 10.0524 12.2589 10.1462 12.3527C10.24 12.4465 10.3671 12.4991 10.4998 12.4991C10.6324 12.4991 10.7595 12.4465 10.8533 12.3527C10.9471 12.2589 10.9998 12.1318 10.9998 11.9991V5.99915Z" fill="#DC3545" />
														<path fill-rule="evenodd" clip-rule="evenodd" d="M14.4998 2.99915C14.4998 3.26436 14.3944 3.51872 14.2069 3.70625C14.0193 3.89379 13.765 3.99915 13.4998 3.99915H12.9998V12.9991C12.9998 13.5296 12.789 14.0383 12.414 14.4134C12.0389 14.7884 11.5302 14.9991 10.9998 14.9991H4.99976C4.46932 14.9991 3.96061 14.7884 3.58554 14.4134C3.21047 14.0383 2.99976 13.5296 2.99976 12.9991V3.99915H2.49976C2.23454 3.99915 1.98019 3.89379 1.79265 3.70625C1.60511 3.51872 1.49976 3.26436 1.49976 2.99915V1.99915C1.49976 1.73393 1.60511 1.47958 1.79265 1.29204C1.98019 1.1045 2.23454 0.999146 2.49976 0.999146H5.99976C5.99976 0.733929 6.10511 0.479575 6.29265 0.292039C6.48019 0.104502 6.73454 -0.000854492 6.99976 -0.000854492H8.99976C9.26497 -0.000854492 9.51933 0.104502 9.70686 0.292039C9.8944 0.479575 9.99976 0.733929 9.99976 0.999146H13.4998C13.765 0.999146 14.0193 1.1045 14.2069 1.29204C14.3944 1.47958 14.4998 1.73393 14.4998 1.99915V2.99915ZM4.11776 3.99915L3.99976 4.05815V12.9991C3.99976 13.2644 4.10511 13.5187 4.29265 13.7063C4.48019 13.8938 4.73454 13.9991 4.99976 13.9991H10.9998C11.265 13.9991 11.5193 13.8938 11.7069 13.7063C11.8944 13.5187 11.9998 13.2644 11.9998 12.9991V4.05815L11.8818 3.99915H4.11776ZM2.49976 2.99915V1.99915H13.4998V2.99915H2.49976Z" fill="#DC3545" />
													</g>
													<defs>
														<clipPath id="clip0_1003_1720">
															<rect width="16" height="16" fill="white" />
														</clipPath>
													</defs>
												</svg>

											</Button>}

										</Td>
									</Tr>
								)
							}}
						/>


					</Box>
					{
						crauledData.pages > 1 && <Box mt="4">
							<PaginatorTwo onPageChange={handlePageClick} pageRangeDisplayed={5} forcePage={forcePage}
								pageCount={crauledData.pages} />
						</Box>
					}
				</Box >
			</>
		}
		return null
	}, [crauledData, crawlDatLoading, crawlDataLoading, handlePageClick, handleURLClick, isSubmitting, loadingText]);

	const getCrawledDocs = React.useCallback(() => {
		if (isUploadingDocs || isSubmitting) {
			return <>
				<VStack alignItems="center" w="100%" mb="6">
					<VStack w="100%">
						<Flex direction="column" justifyContent="center" alignItems="center" borderRadius="md" border="1px solid" borderColor="gray.200" w="100%" p="12">
							<Spinner color='gray.700' mb="4" />
							<Text color="gray.500">
								{isUploadingDocs ? 'Uploading files...' : loadingText}
							</Text>
						</Flex>
					</VStack>
				</VStack>
			</>
		}
		if (localDocsData && localDocsData?.docs.length) {
			return <>
				<Box>
					<Box position="relative">
						{docsDataLoading ? <Box className={styles.crawlDataLoading}><Spinner color='gray.700' size="xs" /></Box> : ''}
						<TableContainer>
							<Table size='sm'>
								<Thead>
									<Tr>
										<Th>Files</Th>
									</Tr>
								</Thead>
								<Tbody>
									{localDocsData?.docs?.map((doc, index) => {
										return (
											<Tr key={doc._id}>
												<Td className={classNames(styles.urls, {
													[styles.firstUrl]: index === 0,
												})} maxW="400px" overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis" align="center">
													<Flex alignItems="center" justifyContent="space-between">
														{doc.title || (doc.url || '').split('/')[(doc.url || '').split('/').length - 1]}
														{crawlDatLoading === doc._id ? <Box className={styles.urlSpinner}><Spinner color='gray.700' size="xs" /></Box> : ''}
														<Box right="5px" top="5px" position="absolute">
															<Button colorScheme='gray' size='xs' mr={2}
																onClick={() => {
																	handleURLClick(localDocsData?.knowledgebaseId, doc._id);
																}}
															>
																View data
															</Button>
															<IconButton
																variant='outline'
																colorScheme='gray'
																aria-label='Call Sage'
																fontSize='14px'
																size="xs"
																isLoading={deleteDocLoading && docToDelete === doc._id}
																onClick={() => {
																	setDocToDelete(doc._id);
																	handleDocDelete(localDocsData.knowledgebaseId, doc._id)
																}}
																icon={<RiDeleteBin5Line />}
															/>
														</Box>
													</Flex>
												</Td>
											</Tr>
										)
									})}
								</Tbody>
							</Table>
						</TableContainer>
					</Box>
					{
						localDocsData.pages > 1 && <Box mt="4">
							<Paginator onPageChange={handleDocsPageClick} pageRangeDisplayed={5}
								pageCount={localDocsData.pages} />
						</Box>
					}
				</Box>
			</>
		}
		return null
	}, [isUploadingDocs, localDocsData, handleDocsPageClick, handleURLClick, handleDocDelete, deleteDocLoading, docToDelete, crawlDatLoading, docsDataLoading, loadingText, isSubmitting]);


	// console.log("defualtChatbotEnabled", defualtChatbotEnabled);

	return (
		<>
			<Flex h="100%" direction="column" >
				<Formik
					initialValues={{
						websiteUrl: defaultWebsite,
						target: defaultIncludedPaths,
						exclude: defaultExcludedPaths,
						files: defaultFiles,
						isChatbotEnabled: defualtChatbotEnabled
					}}
					onSubmit={async () => { }}
				>
					{({ values, isValid, dirty }: any) => (
						<>
							<VStack
								alignItems="start"
								overflowY="auto"
								spacing="4"
								p={paddingUsed}
							>
								<Form style={{ width: '100%' }}>
									<Box alignItems="start">
										<HStack alignItems="start" spacing="10" w="100%">
											<Box w="60%" pr={"24px"} pb={'100px'} borderRight="1px solid #E2E8F0">
												<Box>
													<Text
														fontSize="20px"
														fontWeight="600"
														mb="4px"
														color="#1A202C"
													>
														Website Details
													</Text>
													<Text fontSize="16px" color="#6C757D" fontWeight="400" mb="24px">
														{/* Enter your website URL and path, will automatically fetch data from your website */}
														Enter your website URL and path to automatically fetch data from your site.

													</Text>
												</Box>
												<Field
													type="text"
													name="websiteUrl"
													validate={validateWebsite}
													onBlur={validateWebsite}
												>
													{({ field, form }: any) => (
														<FormControl
															isRequired
															mb="16px">
															<FormLabel fontWeight={400} color="#212529" fontSize="14px" htmlFor="websiteUrl">
																Website URL
															</FormLabel>
															<Input
																color="#6C757D"
																{...field}
																id="websiteUrl"
																isDisabled={disableWebsiteInput}
																// required
																placeholder="https://app.ultimabot.ai/"
																bg="#E9ECEF"
																fontSize={"14px"}
																fontWeight={"400"}
															/>
															{disableWebsiteInput && (<FormHelperText fontSize="14px" color="#6C757D">
																The website name can not be edited once the product is created.
															</FormHelperText>)}
															{form.touched.websiteUrl && form.errors.websiteUrl && (
																<FormHelperText color="#DC3545">
																	{form.errors.websiteUrl}
																</FormHelperText>
															)}
															<FormErrorMessage>
																{form.errors.websiteUrl}
															</FormErrorMessage>
														</FormControl>
													)}
												</Field>
												<Field type="text" name="target">
													{({ field, form }: any) => (
														<FormControl
															mb="16px"
															isInvalid={form.errors.target && form.touched.target}
														>
															<Flex align="center" gap="0px" mb="8px">
																<FormLabel
																	display="flex"
																	fontWeight={400}
																	color="#212529"
																	fontSize="14px"
																	htmlFor="target"
																	mb="0"
																	mr="4px"
																>
																	Included Paths
																</FormLabel>
																<Popover isOpen={includedPathOpen} onClose={() => setIncludedPathOpen(false)}>
																	<PopoverTrigger>
																		<Box
																			cursor="pointer"
																			as="span"
																			onClick={() => setIncludedPathOpen(!includedPathOpen)}
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
																		<Box whiteSpace="pre-wrap">Add the specific parts of your website you want the system to check/scan.
																			Only type what comes after your website name, and separate multiple paths with commas.
																			For example: /docs, /features
																		</Box>
																	</PopoverContent>
																</Popover>
															</Flex>

															<Textarea
																color="gray.700"
																{...field}
																id="target"
																placeholder="/docs"
																rows={4}
																resize="none"
															/>


															<FormHelperText fontSize="14px" fontWeight={"400"} color="#6C757D" mt={"4px"}>
																Add only the path after the domain separated by a comma. For e.g. /docs, /features.
															</FormHelperText>

															<FormErrorMessage>
																{form.errors.target}
															</FormErrorMessage>
														</FormControl>
													)}
												</Field>
												<Field type="text" name="exclude">
													{({ field, form }: any) => (
														<FormControl
															mb="16px"
															isInvalid={form.errors.exclude && form.touched.exclude}
														>
															<Flex align="center" gap="0px" mb="8px">
																<FormLabel fontWeight={400} color="#212529" mb="0px" mr="4px" fontSize="14px" htmlFor="exclude">
																	Excluded Paths
																</FormLabel>
																<Popover isOpen={excludedPathOpen} onClose={() => setExcludedPathOpen(false)}>
																	<PopoverTrigger>
																		<Box
																			cursor="pointer"
																			as="span"
																			onClick={() => setExcludedPathOpen(!excludedPathOpen)}
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
																		<Box whiteSpace="pre-wrap">Add the parts of your website you do not want the system to check/scan.
																			Only type what comes after your website name.
																			For example: /privacy,/terms-and-conditions
																		</Box>
																	</PopoverContent>
																</Popover>
															</Flex>
															<Textarea
																color="gray.700"
																{...field}
																id="exclude"
																placeholder="/privacy"
																rows={4}
																resize="none"
															/>
															<FormHelperText fontSize="14px" fontWeight={"400"} color="#6C757D" mt={"4px"}>
																Add only the path after the domain separated by a comma. For e.g. /privacy, /terms-and-conditions.
															</FormHelperText>
															<FormErrorMessage>
																{form.errors.exclude}
															</FormErrorMessage>
														</FormControl>
													)}
												</Field>

												<Flex align="start" display={"flex"} mt={"24px"} justify={"space-between"}>
													<Text fontWeight="500" fontSize={"16px"} color="#212529">
														Do you want to enable the ChatBot for this project?
													</Text>
													<Box>
														<Switch
															// disabled={defualtChatbotEnabled || false}
															defaultChecked={defualtChatbotEnabled}
															isChecked={isChatbotEnabled}
															disabled={location?.pathname != "/app/create-bot" ? isChatbotEnabled : false}
															onChange={(e) => {
																if (location?.pathname != "/app/create-bot") {
																	handleStatusUpdate(e.target.checked)
																}
																setIsChatbotEnabled(e.target.checked)
															}}
															colorScheme="blue"
															size="lg"
														/>
													</Box>

												</Flex>
											</Box>
											<Box w="40%">
												<HStack justifyContent="flex-end">
													<Button
														variant="solid"
														isLoading={isSubmitting}
														colorScheme="blue"
														className="btn-hover-pri"
														display={isSubmitting ? "none" : undefined}
														disabled={
															!isValid ||
															(disableSubmitBtnByDefault && (values.files.length === 0 && !values.websiteUrl)) ||
															(!disableSubmitBtnByDefault && ((selectedTab === 0 && !values.websiteUrl) || (selectedTab === 1 && values.files.length === 0)))
														}
														onClick={() => {
															onNextButtonClick(values, "primary");
														}}
														fontFamily={"16px"}
														fontWeight={"500"}
													>
														<Text as="span" mr="4px">
															<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path fill-rule="evenodd" clip-rule="evenodd" d="M4.1426 4.81713C5.0596 3.70613 6.4476 2.99913 7.9996 2.99913C9.15215 2.99928 10.2693 3.39743 11.1621 4.12628C12.055 4.85513 12.6687 5.86994 12.8996 6.99913H11.5336C11.4861 6.99915 11.4396 7.0127 11.3995 7.0382C11.3594 7.0637 11.3274 7.10009 11.3073 7.14311C11.2871 7.18613 11.2797 7.234 11.2857 7.28111C11.2918 7.32823 11.3112 7.37263 11.3416 7.40913L13.3076 9.76913C13.3311 9.79727 13.3604 9.8199 13.3936 9.83544C13.4268 9.85097 13.463 9.85902 13.4996 9.85902C13.5362 9.85902 13.5724 9.85097 13.6056 9.83544C13.6388 9.8199 13.6681 9.79727 13.6916 9.76913L15.6576 7.40913C15.688 7.37263 15.7074 7.32823 15.7135 7.28111C15.7195 7.234 15.7121 7.18613 15.6919 7.14311C15.6718 7.10009 15.6398 7.0637 15.5997 7.0382C15.5596 7.0127 15.5131 6.99915 15.4656 6.99913H13.9166C13.7242 5.86559 13.2103 4.81114 12.436 3.96122C11.6617 3.1113 10.6595 2.50166 9.54877 2.20482C8.438 1.90798 7.26534 1.93643 6.17026 2.28679C5.07519 2.63715 4.10379 3.29466 3.3716 4.18113C3.32728 4.23143 3.29352 4.29012 3.27234 4.35371C3.25116 4.41731 3.24298 4.48452 3.2483 4.55134C3.25361 4.61817 3.27231 4.68324 3.30327 4.74269C3.33424 4.80214 3.37685 4.85476 3.42856 4.89741C3.48027 4.94007 3.54002 4.97189 3.60428 4.99099C3.66853 5.01009 3.73597 5.01607 3.80259 5.00858C3.8692 5.00109 3.93363 4.98028 3.99204 4.94739C4.05045 4.91451 4.10165 4.87021 4.1426 4.81713ZM4.38908 11.4573C3.73595 10.776 3.28891 9.92376 3.0996 8.99913H4.4656C4.5131 8.99912 4.55962 8.98556 4.5997 8.96007C4.63978 8.93457 4.67176 8.89818 4.69191 8.85516C4.71206 8.81214 4.71953 8.76427 4.71345 8.71715C4.70737 8.67004 4.688 8.62564 4.6576 8.58913L2.6916 6.22913C2.66814 6.201 2.63878 6.17836 2.6056 6.16283C2.57242 6.1473 2.53623 6.13925 2.4996 6.13925C2.46296 6.13925 2.42678 6.1473 2.3936 6.16283C2.36042 6.17836 2.33106 6.201 2.3076 6.22913L0.341598 8.58913C0.311196 8.62564 0.291822 8.67004 0.285745 8.71715C0.279669 8.76427 0.287141 8.81214 0.307287 8.85516C0.327433 8.89818 0.359419 8.93457 0.399499 8.96007C0.439579 8.98556 0.486094 8.99912 0.533598 8.99913H2.0826C2.27497 10.1327 2.78887 11.1871 3.56319 12.037C4.3375 12.887 5.33965 13.4966 6.45042 13.7934C7.5612 14.0903 8.73386 14.0618 9.82893 13.7115C10.924 13.3611 11.8954 12.7036 12.6276 11.8171C12.6719 11.7668 12.7057 11.7082 12.7269 11.6446C12.748 11.581 12.7562 11.5137 12.7509 11.4469C12.7456 11.3801 12.7269 11.315 12.6959 11.2556C12.665 11.1961 12.6224 11.1435 12.5706 11.1009C12.5189 11.0582 12.4592 11.0264 12.3949 11.0073C12.3307 10.9882 12.2632 10.9822 12.1966 10.9897C12.13 10.9972 12.0656 11.018 12.0072 11.0509C11.9487 11.0838 11.8975 11.1281 11.8566 11.1811C11.2556 11.9088 10.4609 12.4516 9.56449 12.7468C8.66804 13.0421 7.70636 13.0776 6.79056 12.8494C5.87476 12.6212 5.0422 12.1386 4.38908 11.4573Z" fill="white" />
															</svg>
														</Text>
														{primaryButtonLabel}
													</Button>
												</HStack>
												{getCrauledPaths()}
											</Box>
										</HStack>
										<Box>

										</Box>

									</Box>
								</Form>
							</VStack>

						</>
					)}
				</Formik>
				<Modal isOpen={isOpen} onClose={onClose} size="6xl">
					<ModalOverlay />
					<ModalContent>
						<ModalHeader>Crawled date from the webpage</ModalHeader>
						<ModalCloseButton />
						<ModalBody>
							<Alert status='info' mb="10" fontSize='sm'>
								<AlertIcon />
								We try to automatically strip unwanted content from the crawled data. This may remove some of your content. You can always add custom training data to improve the results.
							</Alert>
							<Box className="markdown-body">
								<ReactMarkdown children={crauledDataDetail}></ReactMarkdown>
							</Box>
						</ModalBody>

						<ModalFooter>
							<Button colorScheme="blue"
								className="btn-hover-pri"
								mr={3} onClick={onClose}>
								Close
							</Button>
						</ModalFooter>
					</ModalContent>
				</Modal>
				<Modal isOpen={isOpens} onClose={onCloses} size="xl">
					<ModalOverlay />
					<ModalContent>
						<ModalHeader>Are you sure you want to crawl the website again?
						</ModalHeader>
						<ModalCloseButton />
						<ModalFooter>
							<Button colorScheme='blue' fontWeight="500" mr={3} onClick={yesUpdate} isDisabled={isUpdate}>
								Yes
							</Button>
							<Button colorScheme='gray' fontWeight="500" mr={3} onClick={onCloses}>
								Close
							</Button>
						</ModalFooter>
					</ModalContent>
				</Modal>
			</Flex>
		</>
	);
};
