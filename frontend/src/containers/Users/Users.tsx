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
  Text,
  VStack,
  InputGroup,
  InputLeftElement,
  Input,
  IconButton,
  Table,
  Thead,
  Select,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Avatar,
  TableCaption,
  TableContainer,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  AlertDialogOverlay,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  Image,
} from "@chakra-ui/react";
import { PaginatorTwo } from "../../widgets/Paginator/PaginatorTwo";
import { Link, NavLink, Route, Switch, useHistory } from "react-router-dom";
import { User } from '../../services/appConfig';
import { CurrentUser } from "../../services/appConfig";
import { EmailPlusIcon } from "../../components/Icons/Icon";
import { IoIosSearch } from "react-icons/io";
import styles from './Users.module.scss';
import { FiMoreHorizontal } from "react-icons/fi";
import LastCrawledFormate from "../../utils/LastCrawledFormate";
import { UserSquare } from "@phosphor-icons/react";
import Pagination from "./Pagination";
import Rectangle from "./Rectangle.png";
import { getAllUsers, SearchUsers, adminDeleteUser } from "../../services/knowledgebaseService";
import { formatNumber } from "../../utils/commonUtils";
import TableComponent from "../TableComponent";
export const Users = () => {
  const toast = useToast();

  const [users, setUsers] = React.useState<any>([]);

  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const history = useHistory();
  const [itemsPerPages, setItemsPerPage] = React.useState<number>(10);
  const [isDeleteDialogOpens, setIsDeleteDialogOpens] = React.useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [userId, setUserId] = React.useState<any>();
  const [shouldFetchUsers, setShouldFetchUsers] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(searchValue);
  const [isSearchActive, setIsSearchActive] = React.useState<boolean>(false);
  const [forcePage, setForcePage] = React.useState<number>(0);
  const [isfetching, setisfetching] = React.useState<boolean>(true);



  const handlePageChange = (page: number) => {
    setCurrentPage(page + 1);
    setForcePage(page);
  };

  const handleInputChange = (event: any) => {
    setSearchValue(event.target.value); // Update state with the input value
  };

  const handleItemsPerPageChange = (event: any) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
    setForcePage(0);
  };

  const fetchData = async (page: number, pageSize: number, searchKeyword: string) => {
    try {
      setisfetching(true)
      const userData = await SearchUsers(pageSize, page, searchKeyword);
      // console.log(userData, "<");
      setisfetching(false)
      setUsers(userData?.data);
    } catch (error) {
      // console.error('Failed to fetch users:', error);
      setisfetching(false)
    } finally {
      setisfetching(false)

    }
  };


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
    fetchData(currentPage, itemsPerPages, debouncedSearchValue);
  }, [debouncedSearchValue, itemsPerPages, currentPage]);


  const handleCancelDeletes = () => {
    setIsDeleteDialogOpens(false);
  };

  const deleteUser = (id: any) => {
    setIsDeleteDialogOpens(true);
    setUserId(id)
  }

  const handleConfirmDeletes = async () => {
    setIsDeleteDialogOpens(false);
    try {
      const res = await adminDeleteUser(userId);
      fetchData(currentPage, itemsPerPages, debouncedSearchValue);
      setShouldFetchUsers(true); // Trigger the fetch

    } catch (error) {
      // console.log(error);
    }
  };
  const formatToK = (value: number) => {
    if (value >= 1000) {
      return `${value / 1000}k`;
    }
    return value.toString();
  };

  return (
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      overflow="auto"

    >
      <VStack w="100%" spacing="10">
        <Flex shrink={0} w="100%" justifyContent="space-between">
          <Flex alignItems="center">
            <Heading fontSize="24">Platform Users</Heading>
          </Flex>
          <Flex>
            <Text as="span">
              <InputGroup
                width="300px"
                background={"#fff"}
                borderRadius="4px"
                outline={"none"}
              >
                <InputLeftElement pointerEvents='none'>
                  <IoIosSearch color="#6C757D" />
                </InputLeftElement>
                <Input type='text' placeholder='Search for URL, Client & Email Id' border="1px solid #CED4DA" color="#6C757D" value={searchValue}
                  onChange={handleInputChange} />
              </InputGroup>
            </Text>
            {/* <Button color={"white"} backgroundColor={'#2977FF'} size='md' className="btn-hover-pri" onClick={() => window.location.href = "/app/inviteuers"}><EmailPlusIcon />Invite Users</Button> */}
          </Flex>
        </Flex>
      </VStack>
      <Box mt="20px" minW="100%" w="600px">

        <TableComponent
          height="calc(100vh - 245px)"
          isLoading={isfetching}
          data={users?.allUsersProfileData || []}
          // noDataText="No SMTP settings found."
          tableHeader={["Name", "Email", "Projects", "Plan", "Usage", "Joined On", "Action"]}
          customRowRenderer={(user: any, index: number) => {
            return (
              <Tr key={index} className={styles.tableTd}>
                <Td>
                  {index + 1 + (currentPage - 1) * itemsPerPages}
                </Td>
                <Td>
                  <Flex align="center">
                    <Avatar size="sm" borderRadius={"50%"} src={user?.avatarUrl || "https://api.dicebear.com/9.x/initials/svg?seed=a@cvinfotech45.com&radius=50&backgroundColor=2977ff&textColor=ffffff&chars=1"} h="32px" w="32px" bg="none" />
                    <Text color="#1A202C" fontWeight="400" ml="12px" textTransform="capitalize">{user.name || "NA"}</Text>
                  </Flex>
                </Td>
                <Td>{user.email || "NA"} {user?.isActive === 3 ? <Text as="span" ml="15px" fontSize="10px" className={styles.inActive}>Inactive</Text> : user.isActive === 2 ? <Text as="span" ml="15px" fontSize="10px" className={styles.projectCount}>Deleted</Text> : null}</Td>
                <Td>{user.project || "NA"}</Td>
                <Td>{user?.activeSubscription || user?.subscriptionData?.name || "NA"}</Td>
                <Td>

                  <Box>
                    <Text as="span">
                      {formatToK(user?.subscriptionData?.balanceAfterUsage || 0)}
                    </Text>
                    &nbsp;/&nbsp;
                    <span style={{ color: "#6C757D" }}>
                      {formatToK(user?.tokenCredits || 0)}
                    </span>
                  </Box>
                </Td>
                <Td><LastCrawledFormate date={user.createdAt} /></Td>
                <Td>
                  <Box gap="10px" display="flex" align-items="center">
                    <Tooltip label="View Pofile" fontSize={"11px"}>
                      {/* <Link to={`/app/users/profile/${user._id}`}> */}
                      <Button
                        colorScheme="gray"
                        p={'4px 8px'}
                        bg={"#F8F9FA!important"}
                        onClick={() => {
                          history.push(`/app/users/profile/${user._id}`)
                        }}
                        size="sm"
                      >
                        <Image src="/icons/eye.svg" alt="view icon" />
                      </Button>
                    </Tooltip>
                    <Tooltip label="Delete User" fontSize={"11px"}>
                      <Button
                        colorScheme="red"
                        p={'4px 8px'}
                        disabled={user.isActive === 2}
                        onClick={() => deleteUser(user._id)}
                        size="sm"

                      >
                        <Image src="/icons/delete.svg" alt="delete" />
                      </Button>
                    </Tooltip>
                  </Box>

                </Td>
              </Tr>
            )
          }}
        />


      </Box>
      {users.totalCount > 10 && <Box>
        <HStack w="100%" justifyContent="space-between" py={4}>
          <Flex alignItems="center">
            <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total {users.totalCount} items</Text>
            <PaginatorTwo forcePage={forcePage} onPageChange={handlePageChange} pageRangeDisplayed={5} pageCount={users.pages} />
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
      <AlertDialog
        isOpen={isDeleteDialogOpens}
        leastDestructiveRef={cancelRef}
        onClose={handleCancelDeletes}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete User
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this user?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} size='sm' onClick={handleCancelDeletes}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                variant="solid"
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
