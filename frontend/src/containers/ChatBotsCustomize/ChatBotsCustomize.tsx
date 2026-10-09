import {
	Accordion,
	AccordionButton,
	AccordionIcon,
	AccordionItem,
	AccordionPanel,
	Box,
	Button, Flex,
	FormControl,
	FormErrorMessage,
	FormHelperText,
	FormLabel, HStack, Input,
	Radio,
	RadioGroup,
	Select,
	Switch,
	Tab,
	TabIndicator,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
	Text,
	Textarea,
	VStack,
	Popover,
	PopoverTrigger,
	PopoverContent,
	PopoverArrow
} from "@chakra-ui/react";
import * as React from "react";
import { GoInfo } from 'react-icons/go';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { Field, FieldArray, Form, Formik } from "formik";


import styles from "./ChatBotsCustomize.module.scss";

import LauncherIcon1 from "../../components/Icons/ChatBotLauncherIcons/LauncherIcon1";
import LauncherIcon2 from "../../components/Icons/ChatBotLauncherIcons/LauncherIcon2";
import LauncherIcon3 from "../../components/Icons/ChatBotLauncherIcons/LauncherIcon3";
import LauncherIcon4 from "../../components/Icons/ChatBotLauncherIcons/LauncherIcon4";
import LauncherIcon5 from "../../components/Icons/ChatBotLauncherIcons/LauncherIcon5";
import { ChatBotCustomizeData } from "../../types/knowledgebase.type";
import { chatWidgetDefaultValues } from "../../utils/commonUtils";
import ChatBotLauncher from "../ChatBotLauncher/ChatBotLauncher";
import GoogleCalendarIntegration from "./GoogleCalendarIntegration";
import { useHistory, useLocation } from "react-router-dom";
import { fetchKnowledgebaseDetails, customizeWidget } from "../../services/knowledgebaseService"
// import { RiDeleteBin5Line } from "react-icons/ri";
export function validateEmailAddress(email: string) {
	return email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}

interface ChatBotsCustomizeProps {
	onNextClick: (formValues: ChatBotCustomizeData) => void;
	onBackClick: () => void;
	chatBotId: string;
	defaultCustomizationValues: ChatBotCustomizeData | undefined;
	primaryButtonLabel?: string;
	isSubmitting?: boolean;
	showheader?: boolean;
	showTimeMessage?: boolean;
	chatBotType?: string
}


export const ChatBotsCustomize = ({
	onNextClick,
	onBackClick,
	chatBotId,
	defaultCustomizationValues,
	primaryButtonLabel = "Update Widget Style",
	isSubmitting = false,
	chatBotType
}: ChatBotsCustomizeProps) => {
	const [isPopoverOpen, setIsPopoverOpen] = React.useState<boolean>(false);
	const [avatarPreviewFieldValue, setavatarFieldValue] = React.useState<any>(defaultCustomizationValues?.avatarFieldValue || "");
	const [message, setMessage] = React.useState("");
	const [emailText, setEmailText] = React.useState("");
	const [selectedTab, setSelectedTab] = React.useState<number>(0);
	// Define the current step state
	const [currentStep, setCurrentStep] = React.useState("content");
	let history = useHistory();
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);

	const subtab = queryParams.get('subtab');

	const formats = [
		'header', 'font', 'size',
		'bold', 'italic', 'underline', 'strike', 'blockquote',
		'list', 'bullet', 'indent',
		'link', 'image', 'color', 'code-block', 'align', 'background'
	];

	// console.log("defaultCustomizationValues", defaultCustomizationValues?.avatarFieldValue);


	const toolbarOptions = [
		[{ header: [1, 2, false] }],
		[{ list: 'ordered' }, { list: 'bullet' }],
		['bold', 'italic', 'underline', 'strike'],
		[{ color: [] }, { background: [] }],
		['link', 'image'],
		[{ align: [] }],
		['code-block'],
		['clean']
	];

	const modules = {
		toolbar: toolbarOptions,
	};


	React.useEffect(() => {
		if (subtab === 'content' ||
			subtab === 'appearance' ||
			subtab === 'leads' ||
			subtab === 'offline-messages' ||
			subtab === 'custom-css' ||
			subtab === 'google-calendar-integration') {
			setCurrentStep(subtab);
		} else {
			setCurrentStep('content');
		}
	}, [subtab]);

	// Handle tab changes
	const handleTabChanges = (index: any) => {
		const steps = [
			"content",
			"appearance",
			"leads",
			"offline-messages",
			"custom-css",
			"google-calendar-integration",
		];
		const newStep: any = steps[index];
		setCurrentStep(newStep);
		history.push(`?tab=settings&subtab=${newStep}`);
	};
	const handleTextAreaChange = React.useCallback((e: any) => {
		const { value } = e.target;
		setMessage(value);
	}, []);

	const handleSwitchChange = React.useCallback((e: any, form) => {
		const { checked, name } = e.target;
		form.setFieldValue(name, checked);

		if (name === 'offlineMessage' && !checked) {
			setSelectedTab(0);
		}

	}, []);

	const handleSwitchChanges = React.useCallback((e: any, form) => {
		const { checked, name } = e.target;

		// Set the field value directly for non-array fields
		form.setFieldValue(name, checked);

		// Handle leadCollectionData updates specifically
		if (name === 'phoneNumber') {
			form.setFieldValue('leadCollectionData', [
				{ ...form.values.leadCollectionData[0], phoneNumber: checked },
				...form.values.leadCollectionData.slice(1),
			]);
		}
		if (name === 'address') {
			form.setFieldValue('leadCollectionData', [
				{ ...form.values.leadCollectionData[0], address: checked },
				...form.values.leadCollectionData.slice(1),
			]);
		}
		if (name === 'isThankYouEmailEnabled') {
			form.setFieldValue('leadCollectionData', [
				{ ...form.values.leadCollectionData[0], isThankYouEmailEnabled: checked },
				...form.values.leadCollectionData.slice(1),
			]);
		}


	}, []);

	const handleQuillChange = (
		content: string,
		fieldName: string,
		form: any
	) => {

		setEmailText(content);
		form.setFieldValue(fieldName, content);
	};


	React.useEffect(() => {
		if (chatWidgetDefaultValues) {
			const valuesToUse = defaultCustomizationValues || chatWidgetDefaultValues;
			// Create a properly typed object addressing all type issues
			const typedValues = {
				...valuesToUse,
				placement: (valuesToUse.placement === 'left' ? 'left' : 'right') as 'left' | 'right',
				// Ensure launcherIcon.svgElement is a string
				avatarFieldValue: avatarPreviewFieldValue || "",
				launcherIcon: {
					...valuesToUse.launcherIcon,
					svgElement: valuesToUse.launcherIcon?.svgElement || '' // Provide default empty string if undefined
				}
			} as ChatBotCustomizeData; // Use type assertion for the whole object

			customizeWidget(chatBotId, typedValues);
		}
	}, [chatWidgetDefaultValues]);

	async function fetchData() {
		try {
			const response: any = await fetchKnowledgebaseDetails(chatBotId);
			setEmailText(response.data.chatWidgeData.thankyouEmailText)
		} catch (error) {
			// console.error(error);
		}
	}
	React.useEffect(() => {
		fetchData();
	}, [chatBotId]);

	return (
		<Flex h="100%" direction="column" position="relative">
			<Flex alignItems="start" w="100%" justifyContent="space-between">
				<Box>
					<Text
						fontSize="20px"
						fontWeight="600"
						mb="4px" // margin-bottom for spacing
						color="#1A202C"
					>
						Customize
					</Text>
					<Text fontSize="16px" color="#6C757D" fontWeight="400" mb="24px">
						Customize the chat widget style based on your website theme.
					</Text>
				</Box>

			</Flex>
			<Formik
				initialValues={defaultCustomizationValues || chatWidgetDefaultValues}
				onSubmit={async () => { }}
			>
				{({
					values,
				}) => (
					<>
						<VStack
							alignItems="start"
							overflowY="auto"
							spacing="8"
							mb="41px"
							position="relative"
							height="calc(100vh - 250px)"
						>
							<HStack w="100%" alignItems="start" overflow="hidden" borderRadius={'8px'} border="1px solid #E2E8F0" height="100%">
								<Box w="50%" h="100%" overflow="auto" borderRight="1px solid #E2E8F0">
									<Form style={{ width: '100%' }}>
										<Box>
											<Tabs
												position='relative'
												w="100%"
												onChange={handleTabChanges}
												index={[
													'content',
													'appearance',
													'leads',
													'offline-messages',
													'custom-css',
													'google-calendar-integration',
												].indexOf(currentStep)}
											>
												<TabList display="flex" justifyContent="space-between" position="relative" w="100%">
													{/* <Box display="flex" gap={0} w="100%"> */}
													<Tab
														id="tab-content"
														isDisabled={isSubmitting}
														_focus={{ outline: "none" }}
														_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
														style={{
															backgroundColor: currentStep === "content" ? '#fff' : '',
															color: currentStep === "content" ? '#2977FF' : '#495057',
															fontSize: '14px',
														}}
														onClick={() => setCurrentStep("content")}
														fontWeight={500}
														borderRadius={'0px !important'}
														padding={"7px !important"}
													>
														Content
													</Tab>
													<Tab
														id="tab-appearance"
														isDisabled={isSubmitting}
														_focus={{ outline: "none" }}
														_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
														style={{
															backgroundColor: currentStep === "appearance" ? '#fff' : '',
															color: currentStep === "appearance" ? '#2977FF' : '#495057',
															fontSize: '14px',
														}}
														onClick={() => setCurrentStep("appearance")}
														fontWeight={500}
														borderRadius={'0px !important'}
														padding={"7px !important"}
													>
														Appearance
													</Tab>
													<Tab
														id="tab-leads"
														isDisabled={isSubmitting}
														_focus={{ outline: "none" }}
														_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
														style={{
															backgroundColor: currentStep === "leads" ? '#fff' : '',
															color: currentStep === "leads" ? '#2977FF' : '#495057',
															fontSize: '14px',
														}}
														onClick={() => setCurrentStep("leads")}
														fontWeight={500}
														borderRadius={'0px !important'}
														padding={"7px !important"}
													>
														Leads
													</Tab>
													<Tab
														id="tab-offline-messages"
														isDisabled={isSubmitting}
														_focus={{ outline: "none" }}
														_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
														style={{
															backgroundColor: currentStep === "offline-messages" ? '#fff' : '',
															color: currentStep === "offline-messages" ? '#2977FF' : '#495057',
															fontSize: '14px',
														}}
														onClick={() => setCurrentStep("offline-messages")}
														fontWeight={500}
														borderRadius={'0px !important'}
														padding={"7px !important"}
													>
														Offline Messages
													</Tab>
													<Tab
														id="tab-custom-css"
														isDisabled={isSubmitting}
														_focus={{ outline: "none" }}
														_disabled={{ cursor: "not-allowed", opacity: "0.4" }}
														style={{
															backgroundColor: currentStep === "custom-css" ? '#fff' : '',
															color: currentStep === "custom-css" ? '#2977FF' : '#495057',
															fontSize: '14px',
														}}
														onClick={() => setCurrentStep("custom-css")}
														fontWeight={500}
														borderRadius={'0px !important'}
														padding={"7px !important"}
													>
														Custom CSS
													</Tab>

												</TabList>

												<TabPanels>
													<TabPanel p="24px">
														<Field type="text" name="heading">
															{({ field, form }: any) => (
																<FormControl
																	mb="8px"
																	isInvalid={
																		form.errors.heading && form.touched.heading
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="heading" color="#212529" fontWeight="400" >
																		Heading
																	</FormLabel>
																	<Input
																		{...field}
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).heading}
																		borderColor="#CED4DA"
																		color="#212529"
																		maxLength={30}
																	/>
																	<FormErrorMessage>
																		{form.errors.heading}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="description">
															{({ field, form }: any) => (
																<FormControl
																	mb="8px"
																	mt="16px"
																	isInvalid={
																		form.errors.description && form.touched.description
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="description" color="#212529" fontWeight="400" >
																		Description
																	</FormLabel>
																	<Textarea
																		{...field}
																		rows={2}
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).description}
																		borderColor="#CED4DA"
																		color="#212529"
																	/>
																	<FormErrorMessage>
																		{form.errors.description}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="chatInputPlaceholderText">
															{({ field, form }: any) => (
																<FormControl
																	mb="8px"
																	mt="16px"
																	isInvalid={
																		form.errors.chatInputPlaceholderText && form.touched.chatInputPlaceholderText
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="chatInputPlaceholderText" color="#212529" fontWeight="400" >
																		Chat Input Placeholder Text
																	</FormLabel>
																	<Input
																		{...field}
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).chatInputPlaceholderText}
																		borderColor="#CED4DA"
																		color="#212529"
																		maxLength={30}
																	/>
																	<FormErrorMessage>
																		{form.errors.chatInputPlaceholderText}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Box className={styles.nestedFormCont} mt="24px">
															<Text className={styles.nestedFormHeading} fontSize="20px" mb="10px" fontWeight="600" color="1A202C">Welcome Messages</Text>
															<FieldArray name="welcomeMessages">
																{({ insert, remove, push }) => (
																	<Box className={styles.nestedForm}>
																		{values.welcomeMessages.length > 0 &&
																			values.welcomeMessages.map((friend, index) => (
																				<Box key={index} mb="4">

																					<Field type="text" name={`welcomeMessages.${index}`}>
																						{({ field, form }: any) => (
																							<FormControl
																								mb="2"
																							>
																								<FormLabel fontWeight="400" color="#212529" fontSize="16px" htmlFor={`welcomeMessages.${index}`}>
																									Message
																								</FormLabel>
																								<Input pos="relative" borderColor="#CED4DA" color="#6C757D"
																									{...field}
																								/>
																								{/* <Icon
																										className={styles.questionDeleteBtn}
																										// variant='outline'
																										// colorScheme='gray'
																										aria-label='Delete Question'
																										fontSize='14px'
																										// size="xs"
																										onClick={() => remove(index)}
																										icon={}
																									/> */}
																								<Text as="span" cursor={"pointer"} className={styles.questionDeleteBtn} padding="12px 12px" bg="#E9ECEF" onClick={() => remove(index)}>
																									<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
																										<g clip-path="url(#clip0_1428_7459)">
																											<rect width="16" height="16" fill="white" fill-opacity="0.01" />
																											<g clip-path="url(#clip1_1428_7459)">
																												<path d="M5.49951 5.49915C5.63212 5.49915 5.7593 5.55182 5.85307 5.64559C5.94683 5.73936 5.99951 5.86654 5.99951 5.99915V11.9991C5.99951 12.1318 5.94683 12.2589 5.85307 12.3527C5.7593 12.4465 5.63212 12.4991 5.49951 12.4991C5.3669 12.4991 5.23973 12.4465 5.14596 12.3527C5.05219 12.2589 4.99951 12.1318 4.99951 11.9991V5.99915C4.99951 5.86654 5.05219 5.73936 5.14596 5.64559C5.23973 5.55182 5.3669 5.49915 5.49951 5.49915ZM7.99951 5.49915C8.13212 5.49915 8.2593 5.55182 8.35307 5.64559C8.44683 5.73936 8.49951 5.86654 8.49951 5.99915V11.9991C8.49951 12.1318 8.44683 12.2589 8.35307 12.3527C8.2593 12.4465 8.13212 12.4991 7.99951 12.4991C7.8669 12.4991 7.73973 12.4465 7.64596 12.3527C7.55219 12.2589 7.49951 12.1318 7.49951 11.9991V5.99915C7.49951 5.86654 7.55219 5.73936 7.64596 5.64559C7.73973 5.55182 7.8669 5.49915 7.99951 5.49915ZM10.9995 5.99915C10.9995 5.86654 10.9468 5.73936 10.8531 5.64559C10.7593 5.55182 10.6321 5.49915 10.4995 5.49915C10.3669 5.49915 10.2397 5.55182 10.146 5.64559C10.0522 5.73936 9.99951 5.86654 9.99951 5.99915V11.9991C9.99951 12.1318 10.0522 12.2589 10.146 12.3527C10.2397 12.4465 10.3669 12.4991 10.4995 12.4991C10.6321 12.4991 10.7593 12.4465 10.8531 12.3527C10.9468 12.2589 10.9995 12.1318 10.9995 11.9991V5.99915Z" fill="#212529" />
																												<path fill-rule="evenodd" clip-rule="evenodd" d="M14.4995 2.99915C14.4995 3.26436 14.3942 3.51872 14.2066 3.70625C14.0191 3.89379 13.7647 3.99915 13.4995 3.99915H12.9995V12.9991C12.9995 13.5296 12.7888 14.0383 12.4137 14.4134C12.0387 14.7884 11.5299 14.9991 10.9995 14.9991H4.99951C4.46908 14.9991 3.96037 14.7884 3.5853 14.4134C3.21023 14.0383 2.99951 13.5296 2.99951 12.9991V3.99915H2.49951C2.2343 3.99915 1.97994 3.89379 1.7924 3.70625C1.60487 3.51872 1.49951 3.26436 1.49951 2.99915V1.99915C1.49951 1.73393 1.60487 1.47958 1.7924 1.29204C1.97994 1.1045 2.2343 0.999146 2.49951 0.999146H5.99951C5.99951 0.733929 6.10487 0.479575 6.29241 0.292039C6.47994 0.104502 6.7343 -0.000854492 6.99951 -0.000854492H8.99951C9.26473 -0.000854492 9.51908 0.104502 9.70662 0.292039C9.89415 0.479575 9.99951 0.733929 9.99951 0.999146H13.4995C13.7647 0.999146 14.0191 1.1045 14.2066 1.29204C14.3942 1.47958 14.4995 1.73393 14.4995 1.99915V2.99915ZM4.11751 3.99915L3.99951 4.05815V12.9991C3.99951 13.2644 4.10487 13.5187 4.29241 13.7063C4.47994 13.8938 4.7343 13.9991 4.99951 13.9991H10.9995C11.2647 13.9991 11.5191 13.8938 11.7066 13.7063C11.8942 13.5187 11.9995 13.2644 11.9995 12.9991V4.05815L11.8815 3.99915H4.11751ZM2.49951 2.99915V1.99915H13.4995V2.99915H2.49951Z" fill="#212529" />
																											</g>
																										</g>
																										<defs>
																											<clipPath id="clip0_1428_7459">
																												<rect width="16" height="16" fill="white" />
																											</clipPath>
																											<clipPath id="clip1_1428_7459">
																												<rect width="16" height="16" fill="white" />
																											</clipPath>
																										</defs>
																									</svg>
																								</Text>

																							</FormControl>
																						)}
																					</Field>

																				</Box>
																			))}
																		<Button
																			backgroundColor="white"
																			color={"#2977FF"}
																			variant='solid'
																			border="2px solid"
																			fontWeight="500"
																			isFullWidth
																			size='lg'
																			fontSize="16px"
																			className={styles.btnWelcomeMessage}
																			onClick={() => push('')}
																		>
																			<svg width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "10px" }} >
																				<path d="M6.5 0C6.69891 0 6.88968 0.0790178 7.03033 0.21967C7.17098 0.360322 7.25 0.551088 7.25 0.75V5.25H11.75C11.9489 5.25 12.1397 5.32902 12.2803 5.46967C12.421 5.61032 12.5 5.80109 12.5 6C12.5 6.19891 12.421 6.38968 12.2803 6.53033C12.1397 6.67098 11.9489 6.75 11.75 6.75H7.25V11.25C7.25 11.4489 7.17098 11.6397 7.03033 11.7803C6.88968 11.921 6.69891 12 6.5 12C6.30109 12 6.11032 11.921 5.96967 11.7803C5.82902 11.6397 5.75 11.4489 5.75 11.25V6.75H1.25C1.05109 6.75 0.860322 6.67098 0.71967 6.53033C0.579018 6.38968 0.5 6.19891 0.5 6C0.5 5.80109 0.579018 5.61032 0.71967 5.46967C0.860322 5.32902 1.05109 5.25 1.25 5.25H5.75V0.75C5.75 0.551088 5.82902 0.360322 5.96967 0.21967C6.11032 0.0790178 6.30109 0 6.5 0Z" fill="#2977FF" />
																			</svg>
																			Add Welcome Message
																		</Button>
																	</Box>
																)}
															</FieldArray>
														</Box>
														<Field type="text" name="showAsPopup">
															{({ field, form }: any) => (
																<FormControl mb="6" mt="20px">
																	<Flex justifyContent="space-between" w="100%" alignItems="center">

																		<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="showAsPopup">
																			{/* Show welcome messages as popup */}
																			Show Popup Title

																		</FormLabel>
																		<Switch
																			{...field}
																			defaultChecked={(defaultCustomizationValues || chatWidgetDefaultValues).showAsPopup}
																			onChange={(event) => { handleSwitchChange(event, form) }}
																			colorScheme="blue"
																			size="lg"
																		// mr="2"
																		/>
																	</Flex>
																</FormControl>
															)}
														</Field>
														{/* <Field type="text" name="popupDelay">
															{({ field, form }: any) => (
																<FormControl
																	mb="8px"
																	isInvalid={
																		form.errors.popupDelay && form.touched.popupDelay
																	}
																>

																	<FormLabel fontSize="16px" htmlFor="popupDelay" color="#212529" fontWeight="400" >
																		Show popup after (ms)
																	</FormLabel>
																	<Input
																		{...field}
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).popupDelay}
																		borderColor="#CED4DA"
																		maxLength={10}
																		type="number"
																		color="#212529"
																	/>
																	<FormErrorMessage>
																		{form.errors.popupDelay}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field> */}
														{/* new section added for delaying in pop message show  */}

														<Field name="showIconPopup">
															{({ field, form }: any) => (
																<FormControl mb="6" mt={"16px"}>
																	<Flex justify="space-between" align="center">
																		<FormLabel fontSize="16px" fontWeight="500" mb="0">
																			{/* Show Icon Popup Immediately */}
																			Show chat button immediately
																		</FormLabel>

																		<Switch
																			isChecked={field.value}
																			onChange={(e) => {
																				const checked = e.target.checked;

																				form.setFieldValue("showIconPopup", checked);
																				if (checked) {
																					form.setFieldValue("popupDelayMs", 0);
																				}
																			}}
																			colorScheme="blue"
																			size="lg"
																		/>
																	</Flex>
																</FormControl>
															)}
														</Field>

														<Field name="popupDelayMs">
															{({ field, form }: any) => {
																const showDelay = !form.values.showIconPopup;
																if (!showDelay) return null;
																return (
																	<FormControl
																		mb="6"
																		isDisabled={!showDelay}
																		isInvalid={
																			form.errors.popupDelayMs && form.touched.popupDelayMs
																		}
																	>
																		<FormLabel fontSize="16px" fontWeight="500">
																			Popup Delay (ms)
																		</FormLabel>

																		<Input
																			{...field}
																			type="number"
																			max={100000}
																			placeholder="Enter delay in milliseconds"
																			borderColor="#CED4DA"
																			onChange={(e) => {
																				// form.setFieldValue(
																				// 	"popupDelayMs",
																				// 	e.target.value === "" ? "" : Number(e.target.value)
																				// )
																				const value = e.target.value;

																				if (value === "") {
																					form.setFieldValue("popupDelayMs", "");
																					return;
																				}

																				const numberValue = Number(value);

																				if (numberValue <= 100000) {
																					form.setFieldValue("popupDelayMs", numberValue);
																				}

																			}

																			}
																		/>

																		<FormErrorMessage>
																			{form.errors.popupDelayMs}
																		</FormErrorMessage>
																	</FormControl>
																);
															}}
														</Field>

														<FieldArray name="excludedUrls">
															{({ push, remove, form }: any) => (
																<FormControl mt="8">
																	<FormLabel fontSize="16px" fontWeight="500">
																		Hide chatbot on these URLs
																	</FormLabel>

																	{form.values.excludedUrls?.map(
																		(url: string, index: number) => (
																			<Flex key={index} mb="3" gap="2">
																				<Input
																					value={url}
																					placeholder="https://example.com/page"
																					onChange={(e) =>
																						form.setFieldValue(
																							`excludedUrls.${index}`,
																							e.target.value
																						)
																					}
																					borderColor="#CED4DA"
																				/>

																				<Button
																					colorScheme="red"
																					fontWeight={500}
																					variant="ghost"
																					onClick={() => remove(index)}
																				>
																					Remove
																				</Button>
																			</Flex>
																		)
																	)}

																	<Button
																		mt="2"
																		size="sm"
																		colorScheme="blue"
																		fontWeight={500}
																		onClick={() => push("")}
																	>
																		+ Add URL
																	</Button>
																</FormControl>
															)}
														</FieldArray>




														<Box className={styles.nestedFormCont} mt="24px">
															<Text className={styles.nestedFormHeading} fontSize="20px" mb="10px" fontWeight="600">
																Add your links here
															</Text>
															<FieldArray name="questionExamples">
																{({ insert, remove, push }) => (
																	<Box className={styles.nestedForm}>
																		<Box mb="4">
																			{/* <IconButton
																					className={styles.questionDeleteBtn}
																					variant='outline'
																					colorScheme='gray'
																					aria-label='Delete Question'
																					fontSize='14px'
																					size="xs"
																					onClick={() => remove(index)}
																					icon={<RiDeleteBin5Line />}
																				/> */}

																			<Field type="text" name="emailLabel">
																				{({ field, form }: any) => (
																					<FormControl
																						mt="16px"
																						mb="8px"
																						isInvalid={
																							form.errors.emailLabel && form.touched.emailLabel
																						}
																					>
																						<FormLabel fontSize="16px" htmlFor="emailLabel" color="#212529" fontWeight="400" >
																							Email Field Label
																						</FormLabel>
																						<Input
																							{...field}
																							placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).emailLabel}
																							// isDisabled={!values.offlineMessage}
																							borderColor="#CED4DA"
																							maxLength={30}
																						/>
																						<FormErrorMessage>
																							{form.errors.emailLabel}
																						</FormErrorMessage>
																					</FormControl>
																				)}
																			</Field>

																			<Field type="text" name={'contentEmail'}>
																				{({ field, form }: any) => (
																					<FormControl
																						mb="2"
																					>
																						<FormLabel fontWeight="400" color="#212529" fontSize="16px" htmlFor={'contentEmail'}>
																							{/* Question */}
																							Email Field Value
																						</FormLabel>
																						<Input pos="relative" borderColor="#CED4DA" color="#000"
																							{...field}
																							maxLength={30}
																							placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).emailFieldPlaceholder}
																						/>
																					</FormControl>
																				)}
																			</Field>
																			<Field type="text" name={'phoneFieldLabel'}>
																				{({ field, form }: any) => (
																					<FormControl
																						mb="2"
																					>
																						<FormLabel fontWeight="400" color="#212529" fontSize="sm" htmlFor={'phoneFieldLabel'}>
																							Phone Field Label
																						</FormLabel>
																						<Input
																							{...field}
																							placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).emailFieldLabel}
																							// disabled="disabled"
																							maxLength={30}
																						/>
																					</FormControl>
																				)}
																			</Field>
																			<Field type="text" name={'contentPhone'}>
																				{({ field, form }: any) => (
																					<FormControl
																						mb="2"
																					>
																						<FormLabel fontWeight="400" color="#212529" fontSize="sm" htmlFor={'contentPhone'}>
																							Phone Number Field Value
																						</FormLabel>
																						<Input
																							{...field}
																							placeholder="Enter your Phone Number"
																							// disabled="disabled"
																							maxLength={20}
																						/>
																					</FormControl>
																				)}
																			</Field>
																			{/* avatarPlaceHolder and avatarFieldValue */}
																			<Field type="text" name="avatarFieldLabel">
																				{({ field, form }: any) => (
																					<FormControl
																						mt="16px"
																						mb="8px"
																						isInvalid={
																							form.errors.avatarFieldLabel && form.touched.avatarFieldLabel
																						}
																					>
																						<FormLabel fontSize="16px" htmlFor="avatarFieldLabel" color="#212529" fontWeight="400" >
																							Avatar Field Label
																						</FormLabel>
																						<Input
																							{...field}
																							placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).avatarFieldLabel}
																							// isDisabled={!values.offlineMessage}
																							maxLength={30}
																							borderColor="#CED4DA"
																						/>
																						<FormErrorMessage>
																							{form.errors.avatarFieldLabel}
																						</FormErrorMessage>
																					</FormControl>
																				)}
																			</Field>
																			<Field type="text" name={'avatarFieldValue'}>
																				{({ field, form }: any) => (
																					<FormControl
																						mb="2"
																					>
																						<FormLabel fontWeight="400" color="#212529" fontSize="sm" htmlFor={'avatarFieldValue'}>
																							Avatar Field Value
																						</FormLabel>
																						<Input
																							{...field}
																							value={avatarPreviewFieldValue || ""}
																							placeholder="Enter your profile link"
																							onChange={(e) => {
																								field.onChange(e.target.value);
																								setavatarFieldValue(e.target.value)
																							}}
																						// disabled="disabled"
																						/>
																					</FormControl>
																				)}
																			</Field>

																			<Field type="text" name="whatsappFieldLabel">
																				{({ field, form }: any) => (
																					<FormControl
																						mt="16px"
																						mb="8px"
																						isInvalid={
																							form.errors.whatsappFieldLabel && form.touched.whatsappFieldLabel
																						}
																					>
																						<FormLabel fontSize="16px" htmlFor="whatsappFieldLabel" color="#212529" fontWeight="400" >
																							Whatsapp Field Label
																						</FormLabel>
																						<Input
																							{...field}
																							placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).whatsappFieldLabel}
																							// isDisabled={!values.offlineMessage}
																							borderColor="#CED4DA"
																							maxLength={30}
																						/>
																						<FormErrorMessage>
																							{form.errors.whatsappFieldLabel}
																						</FormErrorMessage>
																					</FormControl>
																				)}
																			</Field>
																			<Field type="text" name={'contentWhatsapp'}>
																				{({ field, form }: any) => (
																					<FormControl
																						mb="2"
																					>
																						<FormLabel fontWeight="400" color="#212529" fontSize="sm" htmlFor={'contentWhatsapp'}>
																							Whatsapp
																						</FormLabel>
																						<Input
																							{...field}
																							// disabled="disabled"
																							placeholder="Enter your Whatsapp Number"
																						/>
																					</FormControl>
																				)}
																			</Field>
																			<Field type="text" name="videoFieldLabel">
																				{({ field, form }: any) => (
																					<FormControl
																						mt="16px"
																						mb="8px"
																						isInvalid={
																							form.errors.videoFieldLabel && form.touched.videoFieldLabel
																						}
																					>
																						<FormLabel fontSize="16px" htmlFor="videoFieldLabel" color="#212529" fontWeight="400" >
																							Video Field Label
																						</FormLabel>
																						<Input
																							{...field}
																							placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).videoFieldLabel}
																							// isDisabled={!values.offlineMessage}
																							maxLength={30}
																							borderColor="#CED4DA"
																						/>
																						<FormErrorMessage>
																							{form.errors.videoFieldLabel}
																						</FormErrorMessage>
																					</FormControl>
																				)}
																			</Field>
																			<Field type="text" name={'contentVideo'}>
																				{({ field, form }: any) => (
																					<FormControl
																						mb="2"
																					>
																						<FormLabel fontWeight="400" color="#212529" fontSize="sm" htmlFor={'contentVideo'}>
																							Video
																						</FormLabel>
																						<Input
																							{...field}
																							// disabled="disabled"
																							placeholder="Enter your Video Link"
																						/>
																					</FormControl>
																				)}
																			</Field>
																			<Field type="text" name="appointmentFieldLabel">
																				{({ field, form }: any) => (
																					<FormControl
																						mt="16px"
																						mb="8px"
																						isInvalid={
																							form.errors.appointmentFieldLabel && form.touched.appointmentFieldLabel
																						}
																					>
																						<FormLabel fontSize="16px" htmlFor="appointmentFieldLabel" color="#212529" fontWeight="400" >
																							Appointment Field Label
																						</FormLabel>
																						<Input
																							{...field}
																							placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).appointmentFieldLabel}
																							// isDisabled={!values.offlineMessage}
																							maxLength={30}
																							borderColor="#CED4DA"
																						/>
																						<FormErrorMessage>
																							{form.errors.appointmentFieldLabel}
																						</FormErrorMessage>
																					</FormControl>
																				)}
																			</Field>
																			<Field type="text" name={'contentAppointment'}>
																				{({ field, form }: any) => (
																					<FormControl
																						mb="2"
																					>
																						<FormLabel fontWeight="400" color="#212529" fontSize="sm" htmlFor={'contentAppointment'}>
																							Appointment
																						</FormLabel>
																						<Input
																							{...field}
																							id="contentAppointment"
																							// disabled="disabled"
																							placeholder="Enter your Appointment Link"
																						/>
																					</FormControl>
																				)}
																			</Field>
																		</Box>
																		{/* <Button
																				backgroundColor="white"
																				color={"#2977FF"}
																				variant='solid'
																				border="2px solid"

																				isFullWidth
																				size='lg'
																				fontSize="16px"
																				className={styles.btnWelcomeMessage}
																				onClick={() => push({ question: '', label: '' })}
																			>
																				<svg width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "10px" }} >
																					<path d="M6.5 0C6.69891 0 6.88968 0.0790178 7.03033 0.21967C7.17098 0.360322 7.25 0.551088 7.25 0.75V5.25H11.75C11.9489 5.25 12.1397 5.32902 12.2803 5.46967C12.421 5.61032 12.5 5.80109 12.5 6C12.5 6.19891 12.421 6.38968 12.2803 6.53033C12.1397 6.67098 11.9489 6.75 11.75 6.75H7.25V11.25C7.25 11.4489 7.17098 11.6397 7.03033 11.7803C6.88968 11.921 6.69891 12 6.5 12C6.30109 12 6.11032 11.921 5.96967 11.7803C5.82902 11.6397 5.75 11.4489 5.75 11.25V6.75H1.25C1.05109 6.75 0.860322 6.67098 0.71967 6.53033C0.579018 6.38968 0.5 6.19891 0.5 6C0.5 5.80109 0.579018 5.61032 0.71967 5.46967C0.860322 5.32902 1.05109 5.25 1.25 5.25H5.75V0.75C5.75 0.551088 5.82902 0.360322 5.96967 0.21967C6.11032 0.0790178 6.30109 0 6.5 0Z" fill="#2977FF" />
																				</svg>
																				Add Sample Question
																			</Button> */}
																	</Box>
																)}
															</FieldArray>
														</Box>
													</TabPanel>
													<TabPanel p="6">
														<Field t pt="8" type="text" name="backgroundColor">
															{({ field, form }: any) => (
																<FormControl
																	mb="8px"
																	isInvalid={
																		form.errors.backgroundColor &&
																		form.touched.backgroundColor
																	}
																>
																	<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="backgroundColor">
																		Background Color
																	</FormLabel>
																	<Input
																		{...field}
																		id="backgroundColor"
																		placeholder="#11141C"
																		borderColor="#CED4DA"
																		maxLength={30}
																	/>
																	<FormErrorMessage>
																		{form.errors.backgroundColor}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="fontColor">
															{({ field, form }: any) => (
																<FormControl
																	mt="16px"
																	mb="8px"
																	isInvalid={
																		form.errors.fontColor &&
																		form.touched.fontColor
																	}
																>
																	<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="fontColor">
																		Text Color
																	</FormLabel>
																	<Input
																		{...field}
																		id="fontColor"
																		placeholder="#11141C"
																		borderColor="#CED4DA"
																		maxLength={30}
																	/>
																	<FormErrorMessage>
																		{form.errors.fontColor}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="borderRadius">
															{({ field, form }: any) => (
																<FormControl
																	mt="16px"
																	mb="8px"
																	isInvalid={
																		form.errors.borderRadius && form.touched.borderRadius
																	}
																>
																	<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="borderRadius">
																		Border Radius
																	</FormLabel>
																	<Input
																		{...field}
																		id="borderRadius"
																		placeholder="0px"
																		borderColor="#CED4DA"
																		maxLength={30}
																	/>
																	<FormErrorMessage>
																		{form.errors.borderRadius}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="placement">
															{({ field, form }: any) => (
																<FormControl mt="16px" mb="8px">
																	<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="placement">
																		Widget Position
																	</FormLabel>
																	<RadioGroup
																		{...field}
																		defaultValue="right"
																	>
																		<HStack height="38px" spacing="24px">
																			<Radio {...field}
																				size="md" value="left">
																				<Text fontSize="16px" color={field.value === "left" ? "#212529" : "#6C757D"}>
																					Left
																				</Text>
																			</Radio>
																			<Radio {...field}
																				size="md" value="right">
																				<Text fontSize="16px" color={field.value === "right" ? "#212529" : "#6C757D"}>
																					Right
																				</Text>
																			</Radio>
																		</HStack>
																	</RadioGroup>
																</FormControl>
															)}
														</Field>

													</TabPanel>
													{/* Lead collection data */}
													<TabPanel p="6">
														<Text as="p" fontSize="16px" fontWeight="400" color="#212529">Lead collection data</Text>
														<Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" mb="24px">Which data you would like to get from the ChatBot?</Text>
														<Field type="text" name="leadForNmae">
															{({ field, form }: any) => (
																<FormControl mb="16px" mt="20px">
																	<Flex justifyContent="space-between" w="100%" alignItems="center">
																		<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="leadForNmae">
																			Name
																		</FormLabel>
																		<Switch
																			{...field}
																			// defaultChecked={(defaultCustomizationValues || chatWidgetDefaultValues).showAsPopup}
																			onChange={(event) => { handleSwitchChange(event, form) }}
																			colorScheme="blue"
																			size="lg"
																			mr="2"
																			isDisabled defaultChecked
																		/>
																	</Flex>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="leadForEmail">
															{({ field, form }: any) => (
																<FormControl mb="16px" mt="20px">
																	<Flex justifyContent="space-between" w="100%" alignItems="center">
																		<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="leadForEmail">
																			Email
																		</FormLabel>
																		<Switch
																			{...field}
																			// defaultChecked={(defaultCustomizationValues || chatWidgetDefaultValues).showAsPopup}
																			onChange={(event) => { handleSwitchChange(event, form) }}
																			colorScheme="blue"
																			size="lg"
																			mr="2"
																			isDisabled
																			defaultChecked
																		/>
																	</Flex>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="phoneNumber">
															{({ field, form }: any) => (
																<FormControl mb="16px" mt="20px">
																	<Flex justifyContent="space-between" w="100%" alignItems="center">
																		<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="phoneNumber">
																			Phone
																		</FormLabel>
																		<Switch
																			{...field}
																			defaultChecked={(defaultCustomizationValues || chatWidgetDefaultValues).leadCollectionData[0].phoneNumber}
																			onChange={(event) => { handleSwitchChanges(event, form) }}
																			colorScheme="blue"
																			size="lg"
																			mr="2"

																		/>
																	</Flex>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="address">
															{({ field, form }: any) => (
																<FormControl mb="16px" mt="20px">
																	<Flex justifyContent="space-between" w="100%" alignItems="center">
																		<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="address">
																			Address
																		</FormLabel>
																		<Switch
																			{...field}
																			defaultChecked={(defaultCustomizationValues || chatWidgetDefaultValues).leadCollectionData[0].address}
																			onChange={(event) => { handleSwitchChanges(event, form) }}
																			colorScheme="blue"
																			size="lg"
																			mr="2"
																		/>
																	</Flex>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="isThankYouEmailEnabled">
															{({ field, form }: any) => (
																<FormControl mb="16px" mt="20px">
																	<Flex justifyContent="space-between" w="100%" alignItems="center">
																		<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="isThankYouEmailEnabled">
																			<Flex align="center" mb={1}>
																				Thank You Mail
																				<Popover isOpen={isPopoverOpen} onClose={() => setIsPopoverOpen(false)}>
																					<PopoverTrigger>
																						<Box
																							cursor="pointer"
																							as="span"
																							onClick={() => setIsPopoverOpen(!isPopoverOpen)}
																							ml="10px"
																						>
																							<GoInfo />
																						</Box>
																					</PopoverTrigger>
																					<PopoverContent
																						bg="#efefef"
																						fontWeight={500}
																						color="#333"
																						p={4}
																						width="250px"
																						fontSize="12px"
																						border="1px solid #ccc"
																						lineHeight="20px"
																						style={{ boxShadow: "none" }}
																						borderRadius="4px"
																					>
																						<PopoverArrow bg="#efefef" transform="scale(1.5)" />
																						{/* <PopoverCloseButton /> */}
																						<Box whiteSpace="pre-wrap">This Thank You Mail will be sent after the lead submission on the chatbot.</Box>
																					</PopoverContent>
																				</Popover>
																			</Flex>
																		</FormLabel>
																		<Switch
																			{...field}
																			defaultChecked={(defaultCustomizationValues || chatWidgetDefaultValues).isThankYouEmailEnabled}
																			onChange={(event) => { handleSwitchChanges(event, form) }}
																			colorScheme="blue"
																			size="lg"
																			mr="2"
																		/>
																	</Flex>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="thankyouEmailText">
															{({ field, form }: any) => (
																<FormControl mb="16px" mt="20px">
																	<FormLabel
																		fontWeight="400"
																		fontSize="16px"
																		color="#212529"
																		htmlFor="thankyouEmailText"
																	>
																		Thank You Mail Template
																	</FormLabel>
																	<Box border="1px solid #ddd" borderRadius="md">
																		<ReactQuill
																			theme="snow"
																			value={emailText.replace(/\\n/g, "").replace(/\\+/g, "")}
																			onChange={(content) => handleQuillChange(content, field.name, form)}
																			placeholder={emailText}
																			style={{ height: '250px', overflow: "hidden" }}
																			modules={modules}
																			formats={formats}
																		/>
																	</Box>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="prompt">
															{({ field, form }: any) => (
																<FormControl
																	mb="16px"
																	isInvalid={
																		form.errors.prompt && form.touched.prompt
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="prompt" color="#212529" fontWeight="400" mb="4px" >
																		Base Prompt
																	</FormLabel>
																	<Textarea
																		{...field}
																		rows={6}
																		bordercolor="#CED4DA"
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).prompt}
																	/>
																	<FormHelperText lineHeight="21px" fontSize="14px" color="#6C757D">This base prompt serves as a foundational instruction set for your bot. Feel free to tailor it to suit your specific needs. For instance, if you'd like your bot to respond solely in French, include the directive "Reply only in the French language".</FormHelperText>
																	<FormHelperText lineHeight="21px" fontSize="14px" color="#6C757D">It's a good practice to provide some elementary information about your website in the base prompt to give your bot context.</FormHelperText>
																	<FormErrorMessage>
																		{form.errors.prompt}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="defaultAnswer">
															{({ field, form }: any) => (
																<FormControl
																	mb="6"
																	isInvalid={
																		form.errors.defaultAnswer && form.touched.defaultAnswer
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="defaultAnswer" color="#212529" fontWeight="400" >
																		Default Answer
																	</FormLabel>
																	<Textarea
																		{...field}
																		rows={6}
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).defaultAnswer}
																	/>
																	<FormHelperText lineHeight="21px" fontSize="14px" color="#6C757D">This field allows you to set a default response for the bot when it can't find an appropriate answer. You can personalize it with your own text or even translate it into another language.</FormHelperText>
																	<FormHelperText lineHeight="21px" fontSize="14px" color="#6C757D">For example, you could write 'Sorry, I don't have the answer to that. Please email hi@example.com for help.'</FormHelperText>
																	<FormErrorMessage>
																		{form.errors.defaultAnswer}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														{/* <Field type="text" name="collectEmail">
																{({ field, form }: any) => (
																	<FormControl mb="6">
																		<Flex justifyContent="space-between" w="100%" alignItems="center">

																			<FormLabel fontWeight="400" fontSize="sm" color="gray.700" htmlFor="collectEmail">
																				Collect Email
																			</FormLabel>
																			<Switch
																				{...field}
																				defaultChecked={(defaultCustomizationValues || chatWidgetDefaultValues).collectEmail}
																				onChange={(event) => { handleSwitchChange(event, form) }}
																				colorScheme="teal"
																				size="md"
																				mr="2"
																			/>
																		</Flex>
																	</FormControl>
																)}
															</Field>
															{values.collectEmail && (
																<Field type="text" name="collectEmailText">
																	{({ field, form }: any) => (
																		<FormControl
																			mb="6"
																			isInvalid={
																				form.errors.collectEmailText && form.touched.collectEmailText
																			}
																		>
																			<FormLabel fontSize="sm" htmlFor="collectEmailText" color="gray.700" fontWeight="400" >
																				Collect email Text
																			</FormLabel>
																			<Input
																				{...field}
																				placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).collectEmailText}
																			/>
																			<FormErrorMessage>
																				{form.errors.collectEmailText}
																			</FormErrorMessage>
																		</FormControl>
																	)}
																</Field>
															)}
															<Field type="text" name="showReadMore">
																{({ field, form }: any) => (
																	<FormControl mb="6">
																		<Flex justifyContent="space-between" w="100%" alignItems="center">

																			<FormLabel fontWeight="400" fontSize="sm" color="gray.700" htmlFor="showReadMore">
																				Show read more links
																			</FormLabel>
																			<Switch
																				{...field}
																				defaultChecked={(defaultCustomizationValues || chatWidgetDefaultValues).showReadMore}
																				onChange={(event) => { handleSwitchChange(event, form) }}
																				colorScheme="teal"
																				size="md"
																				mr="2"
																			/>
																		</Flex>
																	</FormControl>
																)}
															</Field>
															{values.showReadMore && (
																<Field type="text" name="readMoreText">
																	{({ field, form }: any) => (
																		<FormControl
																			mb="6"
																			isInvalid={
																				form.errors.readMoreText && form.touched.readMoreText
																			}
																		>
																			<FormLabel fontSize="sm" htmlFor="readMoreText" color="gray.700" fontWeight="400" >
																				Read More Text
																			</FormLabel>
																			<Input
																				{...field}
																				placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).readMoreText}
																			/>
																			<FormErrorMessage>
																				{form.errors.readMoreText}
																			</FormErrorMessage>
																		</FormControl>
																	)}
																</Field>
															)}

															<Field type="text" name="model">
																{({ field, form }: any) => (
																	<FormControl
																		mb="6"
																		isInvalid={
																			form.errors.model && form.touched.model
																		}
																	>
																		<FormLabel fontSize="sm" htmlFor="model" color="gray.700" fontWeight="400" >
																			Model
																		</FormLabel>
																		<Select {...field}>
																			<option value="gpt-3.5-turbo">GPT-3.5-turbo</option>
																			<option value="gpt-4-0613">GPT-4</option>
																		</Select>
																		<FormHelperText fontSize="sm">Token consumption will be 30 times higher for GPT-4 compared to GPT-3.5.</FormHelperText>
																	</FormControl>
																)}
															</Field> */}
													</TabPanel>
													<TabPanel p="6">
														<Field type="text" name="offlineMessage">
															{({ field, form }: any) => (
																<FormControl mb="24px">
																	<Flex justifyContent="space-between" w="100%" alignItems="center">
																		<FormLabel fontWeight="400" fontSize="16px" color="#212529" htmlFor="offlineMessage">
																			Enable offline message
																		</FormLabel>
																		<Switch
																			{...field}
																			defaultChecked={(defaultCustomizationValues || chatWidgetDefaultValues).offlineMessage}
																			onChange={(event) => { handleSwitchChange(event, form) }}
																			colorScheme="blue"
																			size="lg"
																			mr="2"
																		/>
																	</Flex>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="adminEmail">
															{({ field, form }: any) => (
																<FormControl
																	mb="8px"
																	isInvalid={
																		form.errors.adminEmail && form.touched.adminEmail
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="adminEmail" color="#212529" fontWeight="400" >
																		Send email to
																	</FormLabel>
																	<Input
																		{...field}
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).adminEmail}
																		isDisabled={!values.offlineMessage}
																		borderColor="#CED4DA"
																	/>
																	<FormHelperText fontSize="14px">By default, offline messages are forwarded to account owner's email address.</FormHelperText>
																	<FormErrorMessage>
																		{form.errors.adminEmail}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="assistantTabHeader">
															{({ field, form }: any) => (
																<FormControl
																	mt="16px"
																	mb="8px"
																	isInvalid={
																		form.errors.assistantTabHeader && form.touched.assistantTabHeader
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="assistantTabHeader" color="#212529" fontWeight="400" >
																		Assistant Tab Header
																	</FormLabel>
																	<Input
																		{...field}
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).assistantTabHeader}
																		isDisabled={!values.offlineMessage}
																		borderColor="#CED4DA"
																	// maxLength={30}
																	/>
																	<FormErrorMessage>
																		{form.errors.assistantTabHeader}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="offlineMsgTabHeader">
															{({ field, form }: any) => (
																<FormControl
																	mt="16px"
																	mb="8px"
																	isInvalid={
																		form.errors.offlineMsgTabHeader && form.touched.offlineMsgTabHeader
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="offlineMsgTabHeader" color="#212529" fontWeight="400" >
																		Offline Message Tab Header
																	</FormLabel>
																	<Input
																		{...field}
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).offlineMsgTabHeader}
																		isDisabled={!values.offlineMessage}
																		borderColor="#CED4DA"
																	/>
																	<FormErrorMessage>
																		{form.errors.offlineMsgTabHeader}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="offlineMsgHeading">
															{({ field, form }: any) => (
																<FormControl
																	mt="16px"
																	mb="8px"
																	isInvalid={
																		form.errors.offlineMsgHeading && form.touched.offlineMsgHeading
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="offlineMsgHeading" color="#212529" fontWeight="400" >
																		Heading
																	</FormLabel>
																	<Input
																		{...field}
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).offlineMsgHeading}
																		isDisabled={!values.offlineMessage}
																		borderColor="#CED4DA"
																	/>
																	<FormErrorMessage>
																		{form.errors.offlineMsgHeading}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Field type="text" name="offlineMsgDescription">
															{({ field, form }: any) => (
																<FormControl
																	mt="16px"
																	mb="16px"
																	isInvalid={
																		form.errors.offlineMsgDescription && form.touched.offlineMsgDescription
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="offlineMsgDescription" color="#212529" fontWeight="400" >
																		Description
																	</FormLabel>
																	<Textarea
																		{...field}
																		rows={5}
																		placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).offlineMsgDescription}
																		isDisabled={!values.offlineMessage}
																		borderColor="#CED4DA"
																	/>
																	<FormErrorMessage>
																		{form.errors.offlineMsgDescription}
																	</FormErrorMessage>
																</FormControl>
															)}
														</Field>
														<Accordion allowToggle allowMultiple>
															<AccordionItem isDisabled={!values.offlineMessage}>
																<AccordionButton _focus={{ boxShadow: 'none' }} pl={0}>
																	<Box as="span" flex='1' textAlign='left' fontSize="sm" fontWeight="500">
																		Field Labels and Placeholders
																	</Box>
																	<AccordionIcon />
																</AccordionButton>
																<AccordionPanel pb={4}>
																	<Field type="text" name="nameFieldLabel">
																		{({ field, form }: any) => (
																			<FormControl
																				mt="16px"
																				mb="8px"
																				isInvalid={
																					form.errors.nameFieldLabel && form.touched.nameFieldLabel
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="nameFieldLabel" color="#212529" fontWeight="400" >
																					Name Field Label
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).nameFieldLabel}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.nameFieldLabel}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="nameFieldPlaceholder">
																		{({ field, form }: any) => (
																			<FormControl
																				mt="16px"
																				mb="8px"
																				isInvalid={
																					form.errors.nameFieldPlaceholder && form.touched.nameFieldPlaceholder
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="nameFieldPlaceholder" color="#212529" fontWeight="400" >
																					Name Field Placeholder
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).nameFieldPlaceholder}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.nameFieldPlaceholder}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="emailFieldLabel">
																		{({ field, form }: any) => (
																			<FormControl
																				mt="16px"
																				mb="8px"
																				isInvalid={
																					form.errors.emailFieldLabel && form.touched.emailFieldLabel
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="emailFieldLabel" color="#212529" fontWeight="400" >
																					Email Field Label
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).emailFieldLabel || "Email"}
																					isDisabled={!values.offlineMessage}
																					autoComplete="nope"
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.emailFieldLabel}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="emailFieldPlaceholder">
																		{({ field, form }: any) => (
																			<FormControl
																				mt="16px"
																				mb="8px"
																				isInvalid={
																					form.errors.emailFieldPlaceholder && form.touched.emailFieldPlaceholder
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="emailFieldPlaceholder" color="#212529" fontWeight="400" >
																					Email Field Placeholder
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).emailFieldPlaceholder}
																					isDisabled={!values.offlineMessage}
																					autoComplete="nope"
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.emailFieldPlaceholder}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="msgFieldLabel">
																		{({ field, form }: any) => (
																			<FormControl
																				mb="8px"
																				mt="16px"
																				isInvalid={
																					form.errors.msgFieldLabel && form.touched.msgFieldLabel
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="msgFieldLabel" color="#212529" fontWeight="400" >
																					Message Field Label
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).msgFieldLabel}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.msgFieldLabel}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="msgFieldPlaceholder">
																		{({ field, form }: any) => (
																			<FormControl
																				mb="8px"
																				mt="16px"
																				isInvalid={
																					form.errors.msgFieldPlaceholder && form.touched.msgFieldPlaceholder
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="msgFieldPlaceholder" color="#212529" fontWeight="400" >
																					Message Field Placeholder
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).msgFieldPlaceholder}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.msgFieldPlaceholder}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																</AccordionPanel>
															</AccordionItem>
															<AccordionItem isDisabled={!values.offlineMessage}>
																<AccordionButton _focus={{ boxShadow: 'none' }} pl={0}>
																	<Box as="span" flex='1' textAlign='left' fontSize="sm" fontWeight="500">
																		Policy links and consent
																	</Box>
																	<AccordionIcon />
																</AccordionButton>
																<AccordionPanel pb={4}>
																	<Field type="text" name="privacypolicyLabel">
																		{({ field, form }: any) => (
																			<FormControl
																				mt="16px"
																				mb="8px"
																				isInvalid={
																					form.errors.privacypolicyLabel && form.touched.privacypolicyLabel
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="privacypolicyLabel" color="#212529" fontWeight="400" >
																					Privacy Policy Label
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder="Enter Privacy Policy Label"
																					// placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).privacypolicyLabel}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.privacypolicyLabel}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="privacypolicyValue">
																		{({ field, form }: any) => (
																			<FormControl
																				mt="16px"
																				mb="8px"
																				isInvalid={
																					form.errors.privacypolicyValue && form.touched.privacypolicyValue
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="privacypolicyValue" color="#212529" fontWeight="400" >
																					Privacy	Policy Value
																				</FormLabel>
																				<Input
																					{...field}
																					// placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).privacypolicyValue}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																					placeholder="Enter Privacy Policy Value "

																				/>
																				<FormErrorMessage>
																					{form.errors.privacypolicyValue}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="termsandconditionsLabel">
																		{({ field, form }: any) => (
																			<FormControl
																				mt="16px"
																				mb="8px"
																				isInvalid={
																					form.errors.termsandconditionsLabel && form.touched.termsandconditionsLabel
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="termsandconditionsLabel" color="#212529" fontWeight="400" >
																					Terms & Conditions Label
																				</FormLabel>
																				<Input
																					{...field}
																					// placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).termsandconditionsLabel}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																					placeholder="Enter Terms & Conditions label "
																				/>
																				<FormErrorMessage>
																					{form.errors.termsandconditionsLabel}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="termsandconditionsValue">
																		{({ field, form }: any) => (
																			<FormControl
																				mt="16px"
																				mb="8px"
																				isInvalid={
																					form.errors.termsandconditionsValue && form.touched.termsandconditionsValue
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="termsandconditionsValue" color="#212529" fontWeight="400" >
																					Terms & Conditions Value
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder="Enter Privacy Policy link "
																					// placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).termsandconditionsValue}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.termsandconditionsValue}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>

																</AccordionPanel>
															</AccordionItem>
															<AccordionItem isDisabled={!values.offlineMessage}>
																<AccordionButton _focus={{ boxShadow: 'none' }} pl={0}>
																	<Box as="span" flex='1' textAlign='left' fontWeight="500" fontSize="sm">
																		Error Messages
																	</Box>
																	<AccordionIcon />
																</AccordionButton>
																<AccordionPanel>
																	<Field type="text" name="requiredFieldMsg">
																		{({ field, form }: any) => (
																			<FormControl
																				mb="8px"
																				mt="16px"
																				isInvalid={
																					form.errors.requiredFieldMsg && form.touched.requiredFieldMsg
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="requiredFieldMsg" color="#212529" fontWeight="400" >
																					Field Required Message
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).requiredFieldMsg}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.requiredFieldMsg}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="invalidEmailMsg">
																		{({ field, form }: any) => (
																			<FormControl
																				mb="8px"
																				mt="16px"
																				isInvalid={
																					form.errors.invalidEmailMsg && form.touched.invalidEmailMsg
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="invalidEmailMsg" color="#212529" fontWeight="400" >
																					Invalid Email Message
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).invalidEmailMsg}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.invalidEmailMsg}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																</AccordionPanel>
															</AccordionItem>
															<AccordionItem isDisabled={!values.offlineMessage}>
																<AccordionButton _focus={{ boxShadow: 'none' }} pl={0}>
																	<Box as="span" flex='1' textAlign='left' fontWeight="500" fontSize="sm">
																		Submit Button
																	</Box>
																	<AccordionIcon />
																</AccordionButton>
																<AccordionPanel>
																	<Field type="text" name="formSubmitBtnLabel">
																		{({ field, form }: any) => (
																			<FormControl
																				mb="8px"
																				mt="16px"
																				isInvalid={
																					form.errors.formSubmitBtnLabel && form.touched.formSubmitBtnLabel
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="formSubmitBtnLabel" color="#212529" fontWeight="400" >
																					Submit Button Label
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).formSubmitBtnLabel}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.formSubmitBtnLabel}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="formSubmitBtnSubmittingText">
																		{({ field, form }: any) => (
																			<FormControl
																				mb="8x"
																				mt="16px"
																				isInvalid={
																					form.errors.formSubmitBtnSubmittingText && form.touched.formSubmitBtnSubmittingText
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="formSubmitBtnSubmittingText" color="#212529" fontWeight="400" >
																					Submitting Text
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).formSubmitBtnSubmittingText}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.formSubmitBtnSubmittingText}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="formSubmitSuccessMsg">
																		{({ field, form }: any) => (
																			<FormControl
																				mb="8px"
																				mt="16px"
																				isInvalid={
																					form.errors.formSubmitSuccessMsg && form.touched.formSubmitSuccessMsg
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="formSubmitSuccessMsg" color="#212529" fontWeight="400" >
																					Form Submit Success Message
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).formSubmitSuccessMsg}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.formSubmitSuccessMsg}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="formSubmitErrorMsg">
																		{({ field, form }: any) => (
																			<FormControl
																				mb="8px"
																				mt="16px"
																				isInvalid={
																					form.errors.formSubmitErrorMsg && form.touched.formSubmitErrorMsg
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="formSubmitErrorMsg" color="#212529" fontWeight="400" >
																					Form Submit Error Message
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).formSubmitErrorMsg}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.formSubmitErrorMsg}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="formSendAgainBtnLabel">
																		{({ field, form }: any) => (
																			<FormControl
																				mb="8px"
																				mt="16px"
																				isInvalid={
																					form.errors.formSendAgainBtnLabel && form.touched.formSendAgainBtnLabel
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="formSendAgainBtnLabel" color="#212529" fontWeight="400" >
																					Send Again Button Label
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).formSendAgainBtnLabel}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.formSendAgainBtnLabel}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																	<Field type="text" name="formTryAgainBtnLabel">
																		{({ field, form }: any) => (
																			<FormControl
																				mb="8px"
																				mt="16px"
																				isInvalid={
																					form.errors.formTryAgainBtnLabel && form.touched.formTryAgainBtnLabel
																				}
																			>
																				<FormLabel fontSize="16px" htmlFor="formTryAgainBtnLabel" color="#212529" fontWeight="400" >
																					Try Again Button Label
																				</FormLabel>
																				<Input
																					{...field}
																					placeholder={(defaultCustomizationValues || chatWidgetDefaultValues).formTryAgainBtnLabel}
																					isDisabled={!values.offlineMessage}
																					borderColor="#CED4DA"
																				/>
																				<FormErrorMessage>
																					{form.errors.formTryAgainBtnLabel}
																				</FormErrorMessage>
																			</FormControl>
																		)}
																	</Field>
																</AccordionPanel>
															</AccordionItem>
														</Accordion>
													</TabPanel>
													<TabPanel p="6">
														<Field type="text" name="customCSS">
															{({ field, form }: any) => (
																<FormControl
																	mb="8px"
																	isInvalid={
																		form.errors.customCSS && form.touched.customCSS
																	}
																>
																	<FormLabel fontSize="16px" htmlFor="customCSS" color="#212529" fontWeight="400" >
																		Custom CSS
																	</FormLabel>
																	<Textarea
																		{...field}
																		rows={5}
																		borderColor="#CED4DA"
																		placeholder=".ai-assistant-header p {
																				line-height: 1.6;
																			}"
																	/>
																	<FormHelperText fontSize="14px" color="#6C757D">Please use this feature with caution and only if you require specific styling adjustments that can't be achieved through our standard customization options. You are responsible for maintaining backward compatibility with any updates we make. </FormHelperText>
																	<FormHelperText fontSize="14px" color="#6C757D">Note: Changes will not appear in the app's customization section, only in the actual widget. </FormHelperText>
																</FormControl>
															)}
														</Field>
													</TabPanel>
													<TabPanel pt="16px">
														<GoogleCalendarIntegration chatBotType={chatBotType} />
													</TabPanel>
												</TabPanels>
											</Tabs>

										</Box>
									</Form>
								</Box>
								<Flex w="50%" p={'24px'} height="100%" pos="absolute" right="0" top="0" bottom="74px" justifyContent="center" overflow="auto">
									<div className="chat-wrap widget-open" id="chat-wrap" style={{ marginTop: '0', minHeight: "600px" }}>
										<div className="chat-widget" style={{ borderRadius: values.borderRadius, width: '100%', maxWidth: "400px", height: "570px", zIndex: 1 }}>
											<div className="chat-header" style={{ backgroundColor: values.backgroundColor, color: values.fontColor }}>
												<div className="chat-header-top" style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
													<div className="chat-tabs" id="chat-tabs"
														style={{
															marginTop: '-17px',
															display: values.offlineMessage ? 'flex' : 'none',
															position: 'relative',
															backgroundColor: 'rgba(255, 255, 255, 0.2)',
															borderRadius: '16px',
														}}>
														<button id="tab-ai-assistant"
															onClick={() => { setSelectedTab(0) }}
															style={{
																border: 'none',
																padding: '6px 10px',
																fontSize: '13px',
																borderRadius: '16px',
																cursor: 'pointer',
																position: 'relative',
																zIndex: 2,
															}}>
															{selectedTab === 0 && <div className={styles.activeTab} style={{ backgroundColor: values.backgroundColor, left: "4px" }}></div>}
															{values.assistantTabHeader}
														</button>
														<button id="tab-offline-msg"
															onClick={() => { setSelectedTab(1) }}
															style={{
																border: 'none',
																padding: '6px 10px',
																fontSize: '13px',
																borderRadius: '16px',
																cursor: 'pointer',
																position: 'relative',
																zIndex: 2,
															}}
														>
															{selectedTab === 1 && <div className={styles.activeTab} style={{ backgroundColor: values.backgroundColor, right: "4px" }}></div>}
															{values.offlineMsgTabHeader}
														</button>
													</div>
													<div className="chat-close">
														<button className="chat-close-btn" id="chat-close-btn">
															<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-x">
																<line x1="18" y1="6" x2="6" y2="18"></line>
																<line x1="6" y1="6" x2="18" y2="18"></line>
															</svg>
														</button>
													</div>
												</div>
												{
													selectedTab === 0 && (
														<div className="ai-assistant-header">
															<h2>
																{values.heading}
															</h2>
															<p>{values.description}</p>
														</div>
													)
												}
												{
													selectedTab === 1 && (
														<div className="offline-message-header">
															<h2>
																{values.offlineMsgHeading}
															</h2>
															<p>{values.offlineMsgDescription}</p>
														</div>
													)
												}
											</div>
											<div id="chat-container" className="chat-container" style={{ minHeight: "124px" }}>
												{selectedTab === 0 && (
													<div style={{
														display: 'flex',
														flexDirection: 'column',
														height: '100%'
													}}>
														<div id="chat-messages" className="chat-messages">
															{
																values.welcomeMessages.map((item: any, index: number) => (
																	<div className="chat-message chatbot" style={{ marginBottom: "5px" }}>
																		{
																			avatarPreviewFieldValue &&
																			<div className="avatar">
																				<img src={`${avatarPreviewFieldValue}`} style={{
																					width: "45px", height: "45px", borderRadius: "50%"
																				}} alt="Chatbot Avatar" />
																			</div>
																		}
																		<div className="chat-message-text">{item}</div>
																	</div>
																))
															}
															<div className="chat-message user" >
																<div className="chat-message-text" style={{ backgroundColor: values.backgroundColor, color: values.fontColor }}>{chatBotType === 'vakmangids' ? 'Wat is UltimaBot?' : 'What is UltimaBot?'}</div>
															</div>
														</div>
														<div className={styles.chatSampleMessages} id="chat-sample-messages">
															{/* {values.questionExamples.map((item: any, index: number) => (

																	<button onClick={() => {
																		setMessage(item.question)
																	}} className={styles.chatSampleMessage} data-message={item.question} key={index}>{item.label}</button>
																))
																} */}

															{values?.contentEmail?.length > 0 && (
																<button className={styles.chatSampleMessage} data-message={values?.contentEmail}>
																	{values?.emailLabel}
																</button>
															)}
															{values?.contentPhone?.length > 0 && (
																<button className={styles.chatSampleMessage} data-message={values?.contentPhone}>{values?.phoneFieldLabel || 'Phone'}</button>
															)}
															{values?.contentWhatsapp?.length > 0 && (
																<button className={styles.chatSampleMessage} data-message={values?.contentWhatsapp}>{values?.whatsappFieldLabel || "Whatsapp"}</button>
															)}
															{values?.contentVideo?.length > 0 && (
																<button className={styles.chatSampleMessage} data-message={values?.contentVideo}>
																	{values?.videoFieldLabel || 'Video'}
																</button>
															)}
															{values?.contentAppointment?.length > 0 && (
																<button className={styles.chatSampleMessage} data-message={values?.contentAppointment}>
																	{values?.appointmentFieldLabel || 'Appointment'}
																</button>
															)}
														</div>
														<Box id="chat-form">
															<div className="chat-input-wrap">
																<textarea value={message} onChange={handleTextAreaChange} rows={1} className="chat-input textarea js-auto-size" id="chat-input" placeholder={values.chatInputPlaceholderText} ></textarea>
																<button className="chat-submit-btn"><svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
																	<path fillRule="evenodd" clipRule="evenodd" d="M4.394 14.7L13.75 9.3c1-.577 1-2.02 0-2.598L4.394 1.299a1.5 1.5 0 00-2.25 1.3v3.438l4.059 1.088c.494.132.494.833 0 .966l-4.06 1.087v4.224a1.5 1.5 0 002.25 1.299z" style={{ fill: values.backgroundColor }}></path>
																</svg></button>
															</div>
														</Box>
													</div>
												)}
												{selectedTab === 1 && (
													<div className="offline-message" style={{ padding: "20px 20px 10px 20px", position: "relative", height: "100%", overflow: "auto" }}>
														<div className={styles.formGroup}>
															<label className={styles.formLabel}>{values.nameFieldLabel} <span className={styles.formRequired}>*</span></label>
															<input type="text" className={styles.formControl} id="offline-message-name" placeholder={values.nameFieldPlaceholder}></input>
															{/* <div className={styles.invalidFeedback} id="invalid-feedback-email">{values.requiredFieldMsg}</div> */}
														</div>
														<div className={styles.formGroup}>
															<label className={styles.formLabel}>{values.emailFieldLabel} <span className={styles.formRequired}>*</span></label>
															<input type="text" className={styles.formControl} id="offline-message-email" placeholder={values.emailFieldPlaceholder}></input>
															{/* <div className={styles.invalidFeedback} id="invalid-feedback-email-invalid">{values.invalidEmailMsg}</div> */}
														</div>
														<div className={styles.formGroup}>
															<label className={styles.formLabel}>{values.msgFieldLabel} <span className={styles.formRequired}>*</span></label>
															<textarea className={styles.formControl} rows={4} id="offline-message-message"
																placeholder={values.msgFieldPlaceholder}></textarea>
														</div>
														{(values.privacypolicyValue && values.privacypolicyLabel) &&
															<div className={styles.checkboxControl}>
																<input type="checkbox" className={styles.formCheckControl} id="offline-message-link" placeholder={values.privacypolicyValue}></input>
																<label className={styles.formCheckLabel}>{values.privacypolicyLabel} <span className={styles.formRequired}>*</span></label>
																{/* <div className={styles.invalidFeedback} id="invalid-feedback-email-invalid">{values.invalidEmailMsg}</div> */}
															</div>
														}
														{
															(values.termsandconditionsValue && values.termsandconditionsLabel) &&
															<div className={styles.checkboxControl}>
																<input type="checkbox" className={styles.formCheckControl} id="offline-message-link" placeholder={values.termsandconditionsValue}></input>
																<label className={styles.formCheckLabel}>{values.termsandconditionsLabel} <span className={styles.formRequired}>*</span></label>
																{/* <div className={styles.invalidFeedback} id="invalid-feedback-email-invalid">{values.invalidEmailMsg}</div> */}
															</div>
														}
														<button className={styles.formSubmit} id="offline-message-submit"
															type="button" style={{ backgroundColor: values.backgroundColor, color: values.fontColor }}>{values.formSubmitBtnLabel}</button>
													</div>
												)}
											</div>
										</div>
										<ChatBotLauncher backgroundColor={values.backgroundColor} fontColor={values.fontColor} launcherIcon={values.launcherIcon.id} />
									</div>
								</Flex>
							</HStack >
						</VStack >
						<Box
							pos="absolute"
							top="5px"
							right="1px"
						>
							<Button
								variant="solid"
								colorScheme="blue"
								fontWeight={500}
								isLoading={isSubmitting}
								isDisabled={isSubmitting}
								onClick={() => {
									onNextClick({ ...values, avatarFieldValue: avatarPreviewFieldValue || "" } as ChatBotCustomizeData);
								}}
							><Text as="span" mr="4px">
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path fill-rule="evenodd" clip-rule="evenodd" d="M4.1426 4.81713C5.0596 3.70613 6.4476 2.99913 7.9996 2.99913C9.15215 2.99928 10.2693 3.39743 11.1621 4.12628C12.055 4.85513 12.6687 5.86994 12.8996 6.99913H11.5336C11.4861 6.99915 11.4396 7.0127 11.3995 7.0382C11.3594 7.0637 11.3274 7.10009 11.3073 7.14311C11.2871 7.18613 11.2797 7.234 11.2857 7.28111C11.2918 7.32823 11.3112 7.37263 11.3416 7.40913L13.3076 9.76913C13.3311 9.79727 13.3604 9.8199 13.3936 9.83544C13.4268 9.85097 13.463 9.85902 13.4996 9.85902C13.5362 9.85902 13.5724 9.85097 13.6056 9.83544C13.6388 9.8199 13.6681 9.79727 13.6916 9.76913L15.6576 7.40913C15.688 7.37263 15.7074 7.32823 15.7135 7.28111C15.7195 7.234 15.7121 7.18613 15.6919 7.14311C15.6718 7.10009 15.6398 7.0637 15.5997 7.0382C15.5596 7.0127 15.5131 6.99915 15.4656 6.99913H13.9166C13.7242 5.86559 13.2103 4.81114 12.436 3.96122C11.6617 3.1113 10.6595 2.50166 9.54877 2.20482C8.438 1.90798 7.26534 1.93643 6.17026 2.28679C5.07519 2.63715 4.10379 3.29466 3.3716 4.18113C3.32728 4.23143 3.29352 4.29012 3.27234 4.35371C3.25116 4.41731 3.24298 4.48452 3.2483 4.55134C3.25361 4.61817 3.27231 4.68324 3.30327 4.74269C3.33424 4.80214 3.37685 4.85476 3.42856 4.89741C3.48027 4.94007 3.54002 4.97189 3.60428 4.99099C3.66853 5.01009 3.73597 5.01607 3.80259 5.00858C3.8692 5.00109 3.93363 4.98028 3.99204 4.94739C4.05045 4.91451 4.10165 4.87021 4.1426 4.81713ZM4.38908 11.4573C3.73595 10.776 3.28891 9.92376 3.0996 8.99913H4.4656C4.5131 8.99912 4.55962 8.98556 4.5997 8.96007C4.63978 8.93457 4.67176 8.89818 4.69191 8.85516C4.71206 8.81214 4.71953 8.76427 4.71345 8.71715C4.70737 8.67004 4.688 8.62564 4.6576 8.58913L2.6916 6.22913C2.66814 6.201 2.63878 6.17836 2.6056 6.16283C2.57242 6.1473 2.53623 6.13925 2.4996 6.13925C2.46296 6.13925 2.42678 6.1473 2.3936 6.16283C2.36042 6.17836 2.33106 6.201 2.3076 6.22913L0.341598 8.58913C0.311196 8.62564 0.291822 8.67004 0.285745 8.71715C0.279669 8.76427 0.287141 8.81214 0.307287 8.85516C0.327433 8.89818 0.359419 8.93457 0.399499 8.96007C0.439579 8.98556 0.486094 8.99912 0.533598 8.99913H2.0826C2.27497 10.1327 2.78887 11.1871 3.56319 12.037C4.3375 12.887 5.33965 13.4966 6.45042 13.7934C7.5612 14.0903 8.73386 14.0618 9.82893 13.7115C10.924 13.3611 11.8954 12.7036 12.6276 11.8171C12.6719 11.7668 12.7057 11.7082 12.7269 11.6446C12.748 11.581 12.7562 11.5137 12.7509 11.4469C12.7456 11.3801 12.7269 11.315 12.6959 11.2556C12.665 11.1961 12.6224 11.1435 12.5706 11.1009C12.5189 11.0582 12.4592 11.0264 12.3949 11.0073C12.3307 10.9882 12.2632 10.9822 12.1966 10.9897C12.13 10.9972 12.0656 11.018 12.0072 11.0509C11.9487 11.0838 11.8975 11.1281 11.8566 11.1811C11.2556 11.9088 10.4609 12.4516 9.56449 12.7468C8.66804 13.0421 7.70636 13.0776 6.79056 12.8494C5.87476 12.6212 5.0422 12.1386 4.38908 11.4573Z" fill="white" />
									</svg>
								</Text>
								{primaryButtonLabel}
							</Button>
						</Box>
					</>
				)}
			</Formik >
			{/* <GoogleCalendarIntegration /> */}
		</Flex >
	);
};
