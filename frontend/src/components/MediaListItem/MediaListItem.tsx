import * as React from 'react';
import {
	Box,
	BoxProps,
	Button,
	Flex,
	Heading,
	HStack,
	IconButton,
	Image,
	// VStack,
	Menu,
	Stack,
	MenuButton,
	MenuItem,
	MenuList,
	Text,
	AlertDialog,
	AlertDialogBody,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogContent,
	AlertDialogOverlay
} from '@chakra-ui/react';
import { FiMoreHorizontal } from "react-icons/fi"
import styles from './MediaListItem.module.scss';
import LastCrawledFormate from "../../utils/LastCrawledFormate";
import { useEffect, useState, useRef } from 'react';
// import { DefaultMediaImage } from '../DefaultMediaImage/DefaultMediaImage';
import { ProjectInfocard } from "../DefaultMediaImage/ProjectInfocard";
import { formatNumber } from "../../utils/commonUtils";
import { useSelector, useDispatch } from 'react-redux';
import { getProfileRequest } from '../../redux/actions/globalActions';
interface MediaListItemProps extends BoxProps {
	imageUrl: string;
	name: string;
	owner: string;
	updatedAt: string;
	usage?: number;
	websiteData: string;
	imageAlt: string;
	description: string;
	showWarning: boolean;
	showCustomizeMenu: boolean;
	showGetCodeMenu: boolean;
	isPrimaryButtonLoading?: boolean;
	actionButtonLabel?: string;
	showPrimaryActionButton?: boolean;
	onPrimaryActionButtonClick?: () => void;
	onMenuItemClick?: (type: any) => void;
	actionButtonLeftIcon?: React.ReactNode;
	onActionButtonClick?: () => void;
}

export const MediaListItem = ({ onMenuItemClick, showWarning, showPrimaryActionButton, isPrimaryButtonLoading, onPrimaryActionButtonClick, className, ...restProps }: MediaListItemProps) => {
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	// const cancelRef = useRef();
	const cancelRef = useRef<HTMLButtonElement>(null)
	const handleDelete = () => {
		setIsDeleteDialogOpen(true);
	};

	const handleConfirmDelete = () => {
		setIsDeleteDialogOpen(false);
		onSelect("delete");
	};

	const handleCancelDelete = () => {
		setIsDeleteDialogOpen(false);
	};

	const userProfile = useSelector((state: any) => state.user?.profile) || {}
	const isloading = useSelector((state: any) => state.user) || {}
	const dispatch = useDispatch()
	React.useEffect(() => {
		if (!userProfile.name) {
			dispatch(getProfileRequest())
		}
	}, [])

	const onSelect = React.useCallback((type) => {
		onMenuItemClick && onMenuItemClick(type)
	}, [onMenuItemClick]);

	const rawData = localStorage.getItem('userDetails');

	// console.log(rawData, userProfile, restProps);


	return (
		<>
			<Stack
				shadow='xs'
				p='4'
				bg={'white'}
				borderRadius='lg'
				className={className || '' + ' ' + styles.container}
				spacing='4'
				align='start'
				w={'100%'}
				flexShrink={0}
				justify='space-between'
				alignItems='start'
			>
				<HStack
					justify='space-between'
					position="relative"
					width="100%"
				>
					<HStack

					>
						<Stack spacing={4}>
							<Box>
								{restProps.imageUrl ? (
									<Image
										borderRadius='lg'
										objectFit="cover"
										src={restProps.imageUrl}
										alt={restProps.imageAlt}
									/>
								) : (
									<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
										<g clip-path="url(#clip0_10536_82577)">
											<g clip-path="url(#clip1_10536_82577)">
												<path d="M20.075 22.8711V32.9159L9.89514 38.8888V22.8711H20.075Z" fill="#2A78FF" />
												<path d="M20.0412 19.7213L19.9849 38.4274L4.26526 29.3555L4.3215 10.6494L20.0412 19.7213Z" fill="#898989" />
												<path d="M35.6596 10.6494L35.6034 29.3555L19.985 38.4274L20.0412 19.7213L35.6596 10.6494Z" fill="#C5C5C5" />
												<path d="M19.9343 1.11133L36.4526 10.65L20.0412 20.183L3.52289 10.65L19.9343 1.11133ZM20.0412 19.7218L35.6596 10.6444L19.9399 1.57251L4.32153 10.65L20.0412 19.7218Z" fill="#1A5CF5" />
												<path d="M20.0412 20.1824L19.9906 38.8885L3.47229 29.3555L3.52291 10.6494L20.0412 20.1824Z" fill="#2A78FF" />
												<path d="M36.4526 10.6494L36.402 29.3555L19.9906 38.8885L20.0412 20.1824L36.4526 10.6494Z" fill="#1A5CF5" />
												<path d="M19.7003 10.9581C19.7012 10.6382 19.2538 10.3776 18.7009 10.376C18.148 10.3744 17.699 10.6325 17.6981 10.9524C17.6972 11.2724 18.1447 11.533 18.6976 11.5346C19.2505 11.5361 19.6994 11.2781 19.7003 10.9581Z" fill="#1C5AEE" />
												<path d="M15.3001 12.1176C15.6881 11.8927 16.3237 11.887 16.7174 12.1176C17.1111 12.3426 17.1167 12.7138 16.723 12.9388C16.3349 13.1637 15.6994 13.1693 15.3057 12.9388C14.912 12.7138 14.912 12.3426 15.3001 12.1176Z" fill="#1C5AEE" />
												<path d="M25.0786 7.81848C25.0795 7.49854 24.6321 7.23791 24.0792 7.23634C23.5263 7.23477 23.0773 7.49286 23.0764 7.8128C23.0755 8.13273 23.523 8.39336 24.0759 8.39493C24.6288 8.3965 25.0777 8.13841 25.0786 7.81848Z" fill="#1C5AEE" />
												<path d="M22.3894 9.38829C22.3903 9.06836 21.9428 8.80773 21.39 8.80616C20.8371 8.8046 20.3881 9.06269 20.3872 9.38262C20.3863 9.70255 20.8338 9.96318 21.3867 9.96475C21.9396 9.96632 22.3885 9.70823 22.3894 9.38829Z" fill="#1C5AEE" />
											</g>
										</g>
										<defs>
											<clipPath id="clip0_10536_82577">
												<rect width="34" height="37.7778" fill="white" transform="translate(3 1.11133)" />
											</clipPath>
											<clipPath id="clip1_10536_82577">
												<rect width="32.9803" height="37.7778" fill="white" transform="translate(3.47223 1.11133)" />
											</clipPath>
										</defs>
									</svg>

								)}
							</Box>
							<Flex
								alignSelf='start'
								direction='column'
								mt="15px"

							>
								<Heading cursor="pointer" mb='8px' fontSize='14px' fontWeight='500'
									color='#1A202C' onClick={() => {
										onSelect('edit')
									}}>
									{restProps.name.length >= 30 ? restProps.name.slice(0, 30) + "..." : restProps.name}
									{/* {restProps.name} */}
									{restProps.owner === null ? <Text as="span" ml="15px" fontSize="10px" className={styles.projectCount}>Trial</Text> : null}
								</Heading>

								<Heading
									cursor="pointer"
									mb='8px'
									fontSize='12px' // Directly using the desired font-size
									fontWeight='400'
									color='#6C757D' // Directly using the desired color
								>
									{/* {restProps.websiteData} */}
									{restProps.websiteData.length >= 30 ? restProps.websiteData.slice(0, 30) + "..." : restProps.websiteData}

								</Heading>
							</Flex>
						</Stack>


					</HStack>
					<HStack
						position="absolute"
						top="0%"
						right="0%"
					>
						<Box alignSelf='end'>
							{restProps.actionButtonLabel ? (
								<Button
									{...{
										[restProps.actionButtonLeftIcon ? 'leftIcon' : '']:
											restProps.actionButtonLeftIcon,
									}}
									onClick={restProps.onActionButtonClick}
									size='sm'
									variant='outline'
								>
									{restProps.actionButtonLabel}
								</Button>
							) : <Menu placement="bottom-end">
								<MenuButton
									as={IconButton}
									minW='8'
									minH='8'
									h="8"
									aria-label='Options'
									icon={<FiMoreHorizontal />}
									color="#212529"
									variant='outline'
									backgroundColor="#F8F9FA"
								/>
								<MenuList minW="140px">
									<MenuItem fontSize="14" textAlign="right" fontWeight="medium" color="gray.600" onClick={() => {

										onSelect('edit')
									}}>
										Edit
									</MenuItem>
									{/* {restProps.showCustomizeMenu ? <MenuItem fontSize="14" textAlign="right" fontWeight="medium" color="gray.600" onClick={() => {
										onSelect('customize')
									}}>
										Customize
									</MenuItem> : null} */}
									{/* {restProps.showGetCodeMenu ? <MenuItem fontSize="14" textAlign="right" fontWeight="medium" color="gray.600" onClick={() => {
										onSelect('getCode')
									}}>
										Get code
									</MenuItem> : null} */}

									{
										userProfile?._id == restProps?.owner &&
										<MenuItem fontSize="14" textAlign="right" fontWeight="medium" color="gray.600" onClick={handleDelete}>
											Delete
										</MenuItem>
									}

								</MenuList>
							</Menu>}
						</Box>
					</HStack>
				</HStack>
				<Box mt="5px" width="100%">
					<hr style={{ opacity: "40%" }} />
					<Flex
						mt="10px"
						justify="space-between"
						align="center"
						wrap="nowrap"
					>
						<Text
							fontSize="12px"
							fontWeight="400"
							color="#524D4D"
							whiteSpace="nowrap"
						>
							Usage:{" "}
							<Text as="span" color="#6C757D">
								{restProps.usage === undefined ? 0 : formatNumber(restProps.usage)}
							</Text>
						</Text>

						<Text
							fontSize="12px"
							fontWeight="400"
							color="#524D4D"
							whiteSpace="nowrap"
						>
							Last Crawled:{" "}
							<Text as="span" color="#6C757D">
								<LastCrawledFormate date={restProps.updatedAt} />
							</Text>
						</Text>
					</Flex>
				</Box>
			</Stack>
			<AlertDialog
				isOpen={isDeleteDialogOpen}
				leastDestructiveRef={cancelRef}
				onClose={handleCancelDelete}
			>
				<AlertDialogOverlay>
					<AlertDialogContent>
						<AlertDialogHeader fontSize="lg" fontWeight="bold">
							Delete bot?
						</AlertDialogHeader>
						<AlertDialogBody>
							You can't undo this action afterwards.
						</AlertDialogBody>
						<AlertDialogFooter>
							<Button ref={cancelRef} fontWeight={"500"} size='sm' onClick={handleCancelDelete}>
								Cancel
							</Button>
							<Button
								size="sm"
								fontWeight={"500"}
								colorScheme="red"
								variant="solid" onClick={handleConfirmDelete} ml={3}>
								Delete
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialogOverlay>
			</AlertDialog>
		</>
	);
};
