import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Select,
  useToast,
  Text,
  Image,
  useColorModeValue,
  Spinner,
  IconButton,
  HStack,
  Tr,
  Td,
  Tooltip,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialog,
} from '@chakra-ui/react';

import { useLocation } from 'react-router-dom';
import { callApi } from '../../../services/callApi';
import TableComponent from '../../TableComponent';
import { PaginatorTwo } from '../../../widgets/Paginator/PaginatorTwo';

const SuppressBlocked: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState({ total: 0, suppressedNumbers: [] });
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const subtab = queryParams.get('subtab');
  const [filters, setFilters] = useState<any>({ currentPage: "1", totalPages: "", total: "", limit: "10", search: "", delete: "" });
  const toast = useToast();
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  const fetchData = async (page: any, limit: any) => {
    try {
      setIsLoading(true);
      const url = `/voicebot/get-all-suppressed-numbers?page=${page || ""}&limit=${limit || ""}`;
      const response = await callApi(url, "get", "")
      const { suppressedNumbers, ...rest } = response?.data
      setIsLoading(false);
      setData(response.data);
      setFilters({ ...filters, ...rest, delete: "" });

    } catch (error) {
      // console.error('Error fetching data:', error);
      setIsLoading(false);
    }
  };
  const deleteRow = async (number: string) => {
    try {
      const url = `/voicebot/remove-suppressed-number/${number}`;
      const response: any = await callApi(url, "delete", "")
      fetchData(filters?.currentPage, filters?.limit);
      toast({
        title: response?.message || response?.data?.message || "Deleted successfully",
        status: 'success',
        isClosable: true,
      });
      setFilters({ ...filters, delete: "" });
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || error?.message || "Delete failed",
        status: 'error',
        isClosable: true,
      });
      // console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData(filters?.currentPage, filters?.limit);
  }, [subtab, filters?.currentPage, filters?.limit]);


  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, limit: event.target.value, currentPage: "1", delete: "" });
  };


  const handlePageChange = React.useCallback((page) => {
    setFilters({ ...filters, currentPage: (page + 1).toString(), delete: "" });

  }, []);

  return (
    <Box maxW={"100%"}>
      {isLoading === true ? <Box display={"flex"} justifyContent={"center"}><Spinner /></Box> :
        <React.Fragment>
          <Heading size="md" fontWeight={600} color={"#1A202C"}>
            Suppressed Numbers
          </Heading>
          <Text fontSize={"14px"} pt="4px" mb={"0px"} color={'#6C757D'} >
            These numbers will not be used for any future Voice Campaign
          </Text>
          <Box pt="24px">
            <Box>
              <Heading size="md" fontWeight={600} color={"#1A202C"}>Total: {data?.total}</Heading>
            </Box>
            <Box>
              <TableComponent
                isLoading={isLoading}
                data={data?.suppressedNumbers || []}
                tableHeader={["Number", "Action"]}
                customRowRenderer={(number: any, index: number) => {
                  return (
                    <Tr key={index}>
                      <Td >
                        {
                          filters?.currentPage && filters?.limit ?
                            (filters?.currentPage - 1) * filters?.limit + index + 1 : index + 1
                        }
                      </Td>
                      <Td >{number || "-"}</Td>
                      <Td textAlign={"end"} >
                        <Tooltip label="Delete" fontSize={"11px"}>
                          <Button
                            size='sm'
                            colorScheme='red'
                            onClick={() => setFilters({ ...filters, delete: number })}
                          >
                            <Image src="/icons/delete.svg" />
                          </Button>
                        </Tooltip>
                      </Td>
                    </Tr>
                  );
                }}
              />
            </Box>
            {
              filters?.total != "0" &&
              <HStack w="full" justifyContent="space-between" py={2} mb={2}>
                <Flex alignItems="center">
                  <Text mr="8px" fontSize="16px" fontWeight="400" color="#212529">Total {filters?.total || 0} items</Text>
                  <PaginatorTwo
                    onPageChange={handlePageChange}
                    pageRangeDisplayed={5}
                    pageCount={filters?.totalPages || "1"}
                    forcePage={filters?.currentPage - 1}
                  />
                </Flex>
                <Flex alignItems="center">
                  <Select
                    value={filters?.limit || "10"}
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
          </Box>
        </React.Fragment>
      }

      {
        filters?.delete &&
        <AlertDialog
          isOpen={!!filters?.delete}
          leastDestructiveRef={cancelRef}
          onClose={() => {
            setFilters({ ...filters, delete: "" })
          }}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Are you sure you want to delete this?
              </AlertDialogHeader>
              <AlertDialogBody>
                This action cannot be undone.
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button size='sm' fontWeight={"500"} ref={cancelRef} onClick={() => { setFilters({ ...filters, delete: "" }) }}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  colorScheme="red"
                  fontWeight={"500"}
                  variant="solid" onClick={() => deleteRow(filters?.delete)} ml={3}>
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      }
    </Box >
  );
};

export default SuppressBlocked;