import * as React from "react";
import {
	Box,
	Flex,
	Heading,
	useToast,
	VStack,
} from "@chakra-ui/react";
import { Link, useHistory } from "react-router-dom";

import {
	ChatBotProductSetup,
} from "../ChatBotProductSetup/ChatBotProductSetup";
import { createKnowledgebase, fetchKnowledgebaseCrawlData, fetchKnowledgebaseDetails, generateEmbeddings, fetchKnowledgebaseCrawlDataForDocs, addTrainingDoc, updateWebsiteData, deleteKnowledgebase } from "../../services/knowledgebaseService";
import { ProductSetupData, DocsKnowledgeData } from "../../types/knowledgebase.type";


export const CreateChatBots = () => {
	const toast = useToast();
	const history = useHistory();
	const [primaryButtonLabel, setPrimaryButtonLabel] = React.useState("Verify pages");
	const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
	const [isSecondaryBtnSubmitting, setIsSecondaryBtnSubmitting] = React.useState<boolean>(false);
	const [knowledgeBaseId, setKnowledgeBaseId] = React.useState<string>('');
	const [savingStep, setSavingStep] = React.useState<string>('CRAWL');

	const [defaultCrauledData, setDefaultCrauledData] = React.useState<any>();

	const [productSetupLoadingText, setProductSetupLoadingText] = React.useState("Setting up your product");

	const [docsDataLoading, setDocsDataLoading] = React.useState<boolean>(false);
	const [docsData, setDocsData] = React.useState<any>();
	const [isUploadingDocs, setIsUploadingDocs] = React.useState<boolean>(false);

	const [crawlDataLoading, setIrawlDataLoading] = React.useState<boolean>(false);
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

	const handlePrimaryButtonClick = React.useCallback(async (payLoad: ProductSetupData) => {
		setIsSubmitting(true);
		setProductSetupLoadingText('Crawling your website data.. This may take some time depending on the size of the data.');
		try {
			if (knowledgeBaseId !== '') {
				await deleteKnowledgebase(knowledgeBaseId);
			}
			const response: any = await createKnowledgebase(payLoad.websiteData);

			setKnowledgeBaseId(response.data._id);
			let _docsData: DocsKnowledgeData;
			if (payLoad.files?.length && payLoad.files.length > 0) {
				setIsUploadingDocs(true);
				for (const file of payLoad.files) {
					try {
						await addTrainingDoc(response.data._id, file);
					} catch (error: any) {

						toast({
							title: `${file.name} failed to upload. ${(error?.response?.data?.message) || ''}`,
							status: "error",
							isClosable: true,
						});
					}
				}
				setIsUploadingDocs(false);
				setDocsDataLoading(true);
				const _docsDataResponse = await fetchKnowledgebaseCrawlDataForDocs(response.data._id, 1);
				_docsData = {
					docs: _docsDataResponse.data.results,
					pages: _docsDataResponse.data.pages,
					knowledgebaseId: response.data._id
				}
				setDocsData(_docsData);
				setDocsDataLoading(false);
			}

			let interval = setInterval(async () => {
				const details = await fetchKnowledgebaseDetails(response.data._id);
				if (details.data.websiteData !== null) {
					setProductSetupLoadingText('Crawling your website data.. This may take some time depending on the size of the data.');
				}
				const chatBotId = details.data._id
				if (details.data.status === 'CRAWLED' || (details.data.status === 'CREATED' && _docsData && _docsData.docs.length > 0)) {
					setProductSetupLoadingText('Crawling your website data.. This may take some time depending on the size of the data.');
					// setProductSetupLoadingText('Training UltimaBot with your data... This may take some time based on the amount of the data...');
					await generateEmbeddings(chatBotId);
				} else if (details.data.status === 'CRAWL_ERROR' || details.data.status === 'EMBEDDING_ERROR' || (details.data.websiteData === null && (_docsData === undefined || _docsData.docs.length === 0))) {
					clearInterval(interval);
					setIsSubmitting(false);
					toast({
						title: `Error(EMBEDDING_ERROR) while processing data. Please try again later.`,
						status: "error",
						isClosable: true,
					});
				} else if (details.data.status === 'GENERATING_EMBEDDINGS') {
					setProductSetupLoadingText('Crawling your website data.. This may take some time depending on the size of the data.');
				} else if (details.data.status === 'READY') {
					clearInterval(interval);

					const _crawlDataResponse = await fetchKnowledgebaseCrawlData(chatBotId, 1);

					const _data = {
						stats: details.data.crawlData?.stats,
						urls: _crawlDataResponse.data.results,
						pages: _crawlDataResponse.data.pages,
						knowledgebaseId: details.data._id
					}
					setDefaultCrauledData(_data);
					setIsSubmitting(false);
					toast({
						title: `Successfully created your project`,
						status: "success",
						isClosable: true,
					});
					history.push(`/app/edit-bot/${chatBotId}/`);
				}
			}, 2000);
		} catch (error: any) {
			setIsSubmitting(false);
			setDocsDataLoading(false);
			const errorData = error?.response?.data?.message
			toast({
				title: (errorData) || 'Oops! Something went wrong',
				status: "error",
				isClosable: true,
			});
		}
	}, [knowledgeBaseId, toast, history]);


	const handleSecondaryButtonClick = React.useCallback(async (payLoad: ProductSetupData, hasWebsiteDataChanged: boolean) => {

		setIsSubmitting(true);
		setIsSecondaryBtnSubmitting(true);

		try {
			setProductSetupLoadingText('Crawling your website data... This may take some time based on the amount of the data...');

			if (payLoad.websiteData.websiteUrl && hasWebsiteDataChanged) {
				updateWebsiteData(knowledgeBaseId, {
					urls: [],
					websiteUrl: payLoad.websiteData.websiteUrl,
					include: payLoad.websiteData.include,
					exclude: payLoad.websiteData.exclude,
				})
			}

			if (payLoad.files?.length && payLoad.files.length > 0) {
				setIsUploadingDocs(true);
				for (const file of payLoad.files) {
					try {
						await addTrainingDoc(knowledgeBaseId, file);
					} catch (error) {

					}
				}
				setIsUploadingDocs(false);
				setDocsDataLoading(true);
				const _docsDataResponse = await fetchKnowledgebaseCrawlDataForDocs(knowledgeBaseId, 1);
				const _docsData: DocsKnowledgeData = {
					docs: _docsDataResponse.data.results,
					pages: _docsDataResponse.data.pages,
					knowledgebaseId: knowledgeBaseId
				}
				setDocsData(_docsData);
				setDocsDataLoading(false);
			}

			let interval = setInterval(async () => {
				const details = await fetchKnowledgebaseDetails(knowledgeBaseId);

				if (details.data.status === 'CRAWLED' || !details.data.websiteData) {
					clearInterval(interval);



					const _crawlDataResponse = await fetchKnowledgebaseCrawlData(knowledgeBaseId, 1);

					const _data = {
						stats: details.data.crawlData?.stats,
						urls: _crawlDataResponse.data.results,
						pages: _crawlDataResponse.data.pages,
						knowledgebaseId: details.data._id
					}


					setPrimaryButtonLabel('Create Chatbot');
					setIsSecondaryBtnSubmitting(false);
					setIsSubmitting(false);
					setDefaultCrauledData(_data)
					setSavingStep('EMBED');

				} else if (details.data.status === 'CRAWL_ERROR') {
					clearInterval(interval);
					setIsSubmitting(false);
					setIsSecondaryBtnSubmitting(false);
					setPrimaryButtonLabel('Verify pages');
					setKnowledgeBaseId('');
					toast({
						title: `Oops! Something went wrong`,
						status: "error",
						isClosable: true,
					});
				}
			}, 2000);

		} catch (error: any) {
			setIsSubmitting(false);
			setDocsDataLoading(false);
			setIsSecondaryBtnSubmitting(false);
			const errorData = error?.response?.data?.message
			toast({
				title: (errorData) || 'Oops! Something went wrong',
				status: "error",
				isClosable: true,
			});
		}
	}, [knowledgeBaseId, toast]);

	const getProductSetupComponent = React.useCallback(() => {
		return (
			<ChatBotProductSetup
				defaultCrauledData={defaultCrauledData}
				onCrawlDataPaginationClick={getCrawlDataPagination}
				onDocsDataPaginationClick={getDocsDataPagination}
				crawlDataLoading={crawlDataLoading}
				isSubmitting={isSubmitting}
				chatbotType={''}
				disableTabs={isSubmitting}
				onTabsChange={() => { }}
				isSecondaryBtnSubmitting={isSecondaryBtnSubmitting}
				getCrawlDataPagination={getCrawlDataPagination}
				loadingText={productSetupLoadingText}
				disableSubmitBtnByDefault
				primaryButtonLabel={"Create Project"}
				secondaryBtnLabel={"Update paths"}
				onPrimaryBtnClick={handlePrimaryButtonClick}
				onSecondaryBtnClick={handleSecondaryButtonClick}
				docsData={docsData}
				isUploadingDocs={isUploadingDocs}
				docsDataLoading={docsDataLoading}
				paddingUsed="24px"
			/>
		);
	}, [crawlDataLoading, defaultCrauledData, docsData, docsDataLoading, getCrawlDataPagination, getDocsDataPagination, handlePrimaryButtonClick, handleSecondaryButtonClick, isSecondaryBtnSubmitting, isSubmitting, isUploadingDocs, productSetupLoadingText]);

	const getMainComponent = React.useCallback(() => {
		return (
			<>
				<Flex
					h="100%"
					direction="column"
					style={{
						display: "flex"
					}}
				>
					{getProductSetupComponent()}
				</Flex>

			</>
		);
	}, [getProductSetupComponent]);

	return (
		<VStack w="100%" h="100vh" overflow="hidden">
			<Flex shrink={0} alignItems="center" w="100%" justifyContent="start" h="60px" bg="#2977FF" color="white" pl={"24px"}>
				<Link to="/app/bots">
					<Flex alignItems="center">
						<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" className="css-i6dzq1"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
						<Heading color="#FFFFFF" fontSize="20px" fontWeight="600" ml={"10px"}>
							Back
						</Heading>
					</Flex>
				</Link>
			</Flex>
			<Flex flex={1} h="calc(100% - 100px)" w="100%" mt={"0 !important"}>
				<Box
					w="100%"
					maxW="100%"
					p={"0px"}
					bg="#F7FAFC"
					shadow="sm"
					h="100%"
					borderRadius="lg"
					position="relative"
					mt={"0"}
				>
					{getMainComponent()}
				</Box>
			</Flex>
		</VStack>
	);
};
