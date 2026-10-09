import React, { useState, ChangeEvent, KeyboardEvent } from 'react';
import {
  Box,
  Button,
  Flex,
  Input,
  InputGroup,
  ButtonGroup,
  InputLeftElement,
  Select,
  Text,
  VStack
} from '@chakra-ui/react';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';

const Pagination: React.FC<{ totalItems: number; itemsPerPage: number; currentPage: number; onPageChange: (page: number) => void; }> = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {

  const [itemsPerPages, setItemsPerPage] = useState<number>(10);
  

  const handleItemsPerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(event.target.value, 10));
   


  };


  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      onPageChange(page);
    }
  };


  return (
    <VStack>
      <Flex justifyContent="space-between" p={4} w="full">
        <Flex alignItems="center"  >
          <Text mr="8px">Total {totalItems} items</Text>
          <ButtonGroup spacing={0}>
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              sx={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #DEE2E6",
                borderRadius: "4px 0px 0px 4px",
                color: "#524D4D"
              }}
            >
              <FaChevronLeft />
            </Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) =>
              page === currentPage ? (
                <Button
                  key={page}
                  sx={{
                    backgroundColor: "#A873F5",
                    border: "1px solid #DEE2E6",
                    borderRadius: "0px",
                    color: "#fff",
                    boxShadow: 'none !important'
                  }}
                >
                  {page}
                </Button>
              ) : (
                <Button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  sx={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #DEE2E6",
                    borderRadius: "0px",
                    color: "#524D4D"
                  }}
                >
                  {page}
                </Button>
              )
            )}
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              sx={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #DEE2E6",
                borderRadius: "0px 4px 4px 0px",
                color: "#000000"
              }}
            >
              <FaChevronRight />
            </Button>
          </ButtonGroup>
        </Flex>
        <Flex>
          <Select
            value={itemsPerPages}
            onChange={handleItemsPerPageChange}
            width="auto"
            color="#6C757D"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </Select>
          <Flex alignItems="center">
          </Flex>
        </Flex>
      </Flex>
    </VStack>

  );
};

export default Pagination;
